<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container"></div>
        <div>
          <t-form :data="searchformData" :label-width="80" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.http_auth_session.user_name')" name="user_name">
              <t-input
                v-model="searchformData.user_name"
                :placeholder="t('common.placeholder')"
                clearable
                :style="{ width: '140px' }"
              />
            </t-form-item>
            <t-form-item :label="t('page.http_auth_session.client_ip')" name="client_ip">
              <t-input
                v-model="searchformData.client_ip"
                :placeholder="t('common.placeholder')"
                clearable
                :style="{ width: '140px' }"
              />
            </t-form-item>
            <t-form-item :label="t('page.http_auth_session.status')" name="status">
              <t-select v-model="searchformData.status" :style="{ width: '110px' }" clearable :placeholder="t('common.all')">
                <t-option :value="1" :label="t('page.http_auth_session.status_valid')" />
                <t-option :value="0" :label="t('page.http_auth_session.status_revoked')" />
              </t-select>
            </t-form-item>
            <t-form-item>
              <t-button theme="default" @click="getList()">
                <template #icon><search-icon /></template>
                {{ t('common.search') }}
              </t-button>
              <t-button theme="danger" variant="outline" :style="{ marginLeft: '8px' }" @click="handleKickAll">
                {{ t('page.http_auth_session.button_kick_all') }}
              </t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>
      <help-block :summary="t('page.http_auth_session.alert_message')" doc="guide/HttpAuthBase" />
      <div class="table-container">
        <t-table
          :columns="columns"
          :data="data"
          :row-key="rowKey"
          vertical-align="top"
          hover
          :pagination="pagination"
          :loading="dataLoading"
          @page-change="rehandlePageChange"
        >
          <template #auth_type="{ row }">
            <t-tag variant="light" :theme="row.auth_type === 'custom' ? 'primary' : 'default'">
              {{ authTypeLabel(row.auth_type) }}
            </t-tag>
          </template>

          <template #user_name="{ row }">
            <t-tooltip v-if="row.user_agent" :content="row.user_agent" :overlay-style="{ maxWidth: '420px' }">
              <span>{{ row.user_name }}</span>
            </t-tooltip>
            <span v-else>{{ row.user_name }}</span>
          </template>

          <template #client_ip="{ row }">
            <div>{{ row.client_ip || '-' }}</div>
            <div class="sub-text">{{ [row.country, row.city].filter(Boolean).join(' ') }}</div>
          </template>

          <template #remain="{ row }">
            <span v-if="row.status !== 1">-</span>
            <t-tooltip v-else :content="`${t('page.http_auth_session.expire_time')}：${row.expire_time}`">
              <span :style="{ color: row.remain_seconds < 600 ? '#e37318' : '' }">
                {{ formatRemain(row.remain_seconds) }}
              </span>
            </t-tooltip>
          </template>

          <template #status="{ row }">
            <t-tag v-if="row.status === 1" theme="success" variant="light">
              {{ t('page.http_auth_session.status_valid') }}
            </t-tag>
            <t-tooltip v-else :content="revokeReasonLabel(row.revoke_reason)">
              <t-tag theme="default" variant="light">{{ t('page.http_auth_session.status_revoked') }}</t-tag>
            </t-tooltip>
          </template>

          <template #op="slotProps">
            <div v-if="slotProps.row.status === 1" class="op-cell">
              <a class="t-button-link" @click="handleKick(slotProps)">
                {{ t('page.http_auth_session.button_kick') }}
              </a>
              <a class="t-button-link" @click="handleKickByUser(slotProps)">
                {{ t('page.http_auth_session.button_kick_user') }}
              </a>
            </div>
            <span v-else>-</span>
          </template>
        </t-table>
      </div>
    </t-card>

    <t-dialog
      v-model:visible="confirmVisible"
      :header="t('common.confirm')"
      :body="confirmBody"
      @confirm="onConfirmKick"
      @cancel="onCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin, type PageInfo, type TableProps } from 'tdesign-vue-next';
import { SearchIcon } from 'tdesign-icons-vue-next';
import {
  wafHttpAuthSessionListApi,
  wafHttpAuthSessionKickApi,
  wafHttpAuthSessionKickByUserApi,
  wafHttpAuthSessionKickAllApi,
} from '@/apis/http_auth_session';

const props = defineProps<{ propHostCode?: string }>();

const { t } = useI18n();

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const rowKey = 'id';
const confirmVisible = ref(false);

// 待确认的操作：kind 决定确认后调哪个接口
const pendingAction = ref<{ kind: string; row: Record<string, any> | null }>({ kind: '', row: null });

// 列宽刻意收紧到能整屏放下：这张表挂在网站编辑弹窗里，可用宽度本来就有限，
// 一旦总宽超出，「操作」列会被挤到可视区外，用户根本点不到踢下线。
// 因此归属地并进登录IP、到期时间与浏览器标识改用悬浮提示承载。
const columns = computed<TableProps['columns']>(() => [
  { title: t('page.http_auth_session.user_name'), width: 110, colKey: 'user_name' },
  { title: t('page.http_auth_session.auth_type'), width: 100, colKey: 'auth_type' },
  { title: t('page.http_auth_session.client_ip'), width: 150, colKey: 'client_ip' },
  { title: t('page.http_auth_session.login_time'), width: 150, ellipsis: true, colKey: 'login_time' },
  { title: t('page.http_auth_session.last_active_time'), width: 150, ellipsis: true, colKey: 'last_active_time' },
  { title: t('page.http_auth_session.remain'), width: 100, colKey: 'remain' },
  { title: t('page.http_auth_session.status'), width: 90, colKey: 'status' },
  { align: 'left', fixed: 'right', width: 140, colKey: 'op', title: t('common.op') },
]);

const pagination = reactive({ total: 0, current: 1, pageSize: 10 });

const searchformData = reactive<Record<string, any>>({
  host_code: props.propHostCode || '',
  user_name: '',
  client_ip: '',
  status: undefined,
});

const confirmBody = computed(() => {
  if (pendingAction.value.kind === 'kick') return t('page.http_auth_session.confirm_kick');
  if (pendingAction.value.kind === 'kickuser') return t('page.http_auth_session.confirm_kick_user');
  if (pendingAction.value.kind === 'kickall') return t('page.http_auth_session.confirm_kick_all');
  return '';
});

function authTypeLabel(type: string) {
  return type === 'custom'
    ? t('page.http_auth_session.auth_type_custom')
    : t('page.http_auth_session.auth_type_authorization');
}

function revokeReasonLabel(reason: string) {
  const key = `page.http_auth_session.reason_${reason}`;
  const label = t(key);
  // 后端将来加了新的失效原因、前端还没跟上时，t() 会把整条 key 原样返回，
  // 这里退回原始值，至少还能看出是什么原因，而不是满屏的 page.xxx.reason_yyy
  return label === key ? reason || '-' : label;
}

// 剩余时长按「时分」显示：会话动辄按小时算，只给秒数没人愿意心算
function formatRemain(sec: number) {
  if (!sec || sec <= 0) return '-';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}${t('page.http_auth_session.unit_hour')}${m}${t('page.http_auth_session.unit_minute')}`;
  if (m > 0) return `${m}${t('page.http_auth_session.unit_minute')}`;
  return `${sec}${t('page.http_auth_session.unit_second')}`;
}

function getList() {
  if (!searchformData.host_code) return;
  dataLoading.value = true;
  // 状态在后端是 *int（不传=全部）。t-select 清空后可能给回空串，
  // 空串进不了 *int，整个请求会被判成「解析失败」——这里直接把该字段摘掉。
  const query: Record<string, any> = {
    pageSize: pagination.pageSize,
    pageIndex: pagination.current,
    ...searchformData,
  };
  if (query.status === '' || query.status === null || query.status === undefined) {
    delete query.status;
  } else {
    query.status = Number(query.status);
  }
  wafHttpAuthSessionListApi(query)
    .then((res) => {
      if (res.code === 0) {
        data.value = res.data.list ?? [];
        pagination.total = res.data.total;
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
    })
    .finally(() => {
      dataLoading.value = false;
    });
}

function rehandlePageChange(pageInfo: PageInfo) {
  pagination.current = pageInfo.current;
  if (pagination.pageSize !== pageInfo.pageSize) {
    pagination.current = 1;
    pagination.pageSize = pageInfo.pageSize;
  }
  getList();
}

function handleKick(e: Record<string, any>) {
  pendingAction.value = { kind: 'kick', row: e.row };
  confirmVisible.value = true;
}

function handleKickByUser(e: Record<string, any>) {
  pendingAction.value = { kind: 'kickuser', row: e.row };
  confirmVisible.value = true;
}

function handleKickAll() {
  pendingAction.value = { kind: 'kickall', row: null };
  confirmVisible.value = true;
}

function resetAction() {
  pendingAction.value = { kind: '', row: null };
}

function onConfirmKick() {
  confirmVisible.value = false;
  const action = pendingAction.value;
  let req: Promise<any> | null = null;
  if (action.kind === 'kick') {
    req = wafHttpAuthSessionKickApi({ id: action.row?.id });
  } else if (action.kind === 'kickuser') {
    req = wafHttpAuthSessionKickByUserApi({
      host_code: searchformData.host_code,
      user_name: action.row?.user_name,
    });
  } else if (action.kind === 'kickall') {
    req = wafHttpAuthSessionKickAllApi({ host_code: searchformData.host_code });
  }
  if (!req) {
    resetAction();
    return;
  }
  req
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        getList();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
    })
    .finally(() => {
      resetAction();
    });
}

function onCancel() {
  resetAction();
}

watch(
  () => props.propHostCode,
  (newVal) => {
    searchformData.host_code = newVal || '';
    getList();
  },
);

onMounted(() => {
  getList();
});
</script>

<style scoped>
.left-operation-container {
  padding: 0 0 6px 0;
  margin-bottom: 16px;
}

/* 归属地跟在登录IP下面，用弱化色，避免为它单开一列把「操作」挤出可视区 */
.sub-text {
  color: var(--td-text-color-placeholder);
  font-size: 12px;
  line-height: 18px;
}

/* 两个下线入口必须待在同一行：换行会把行高撑高，列宽也会被迫变宽 */
.op-cell {
  white-space: nowrap;
}

.op-cell a + a {
  margin-left: 12px;
}

.t-button + .t-button {
  margin-left: 8px;
}
</style>
