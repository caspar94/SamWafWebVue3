<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container"></div>
        <div class="right-operation-container">
          <t-form :data="searchformData" :label-width="70" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.access.audit.label_category')" name="category">
              <t-select
                v-model="searchformData.category"
                :style="{ width: '140px' }"
                clearable
                :placeholder="t('common.select_placeholder')"
              >
                <t-option v-for="c in categoryOptions" :key="c" :value="c" :label="categoryLabel(c)" />
              </t-select>
            </t-form-item>
            <t-form-item :label="t('page.access.audit.label_event')" name="event">
              <t-select
                v-model="searchformData.event"
                :style="{ width: '160px' }"
                clearable
                :placeholder="t('common.select_placeholder')"
              >
                <t-option v-for="e in eventOptions" :key="e" :value="e" :label="eventLabel(e)" />
              </t-select>
            </t-form-item>
            <t-form-item :label="t('page.access.audit.label_account')" name="account_name">
              <t-input v-model="searchformData.account_name" class="search-input" clearable />
            </t-form-item>
            <t-form-item :label="t('page.access.audit.label_ip')" name="client_ip">
              <t-input v-model="searchformData.client_ip" class="search-input" clearable />
            </t-form-item>
            <t-form-item :label="t('page.access.audit.label_host')" name="host">
              <t-input v-model="searchformData.host" class="search-input" clearable />
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList()">
                {{ t('common.search') }}
              </t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>
      <help-block :summary="t('page.access.audit.alert_message')" doc="guide/AccessAudit" />
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
          <template #category="{ row }">
            <t-tag :theme="categoryTheme(row.category)" variant="light">{{
              categoryLabel(row.category)
            }}</t-tag>
          </template>
          <template #event="{ row }">
            <t-tag :theme="eventTheme(row.event)" variant="light">{{ eventLabel(row.event) }}</t-tag>
          </template>
          <template #result="{ row }">
            <t-tag v-if="row.result === 1" theme="success" variant="light">
              {{ t('page.access.audit.result_ok') }}
            </t-tag>
            <t-tag v-else theme="danger" variant="light">{{ t('page.access.audit.result_fail') }}</t-tag>
          </template>
          <template #location="{ row }">
            <span>{{ [row.country, row.city].filter(Boolean).join(' ') || '-' }}</span>
          </template>
        </t-table>
      </div>
    </t-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin, type PageInfo, type TableProps } from 'tdesign-vue-next';
import { wafAccessAuditListApi } from '@/apis/access';

// 与后端 model/access_audit_log.go 的 AccessEvent* 常量一一对应
const EVENTS = [
  'login_ok',
  'login_fail',
  'otp_fail',
  'locked',
  'logout',
  'kick',
  'ticket_issue',
  'ticket_consume',
  'ticket_replay',
  'bad_return_to',
  'denied',
  'bypass_ip',
  'bypass_token',
  'config_ssl_export_write',
  // 网站密码访问（站点级密码那道门），与统一访问认证是两套独立功能，前缀也分开
  'httpauth_login_ok',
  'httpauth_login_fail',
  'httpauth_locked',
  'httpauth_kick',
  'httpauth_expired',
  'httpauth_denied',
];

// 审计分类，与后端 AuditCategory* 常量对应
const CATEGORIES = ['access', 'httpauth', 'config'];

// 安全告警级事件用 danger 高亮：票据重放与回跳地址异常在正常流程里不该出现，
// 一旦出现就意味着有人在主动构造请求。
const DANGER_EVENTS = ['ticket_replay', 'bad_return_to', 'locked', 'httpauth_locked'];
const WARNING_EVENTS = ['login_fail', 'otp_fail', 'denied', 'httpauth_login_fail', 'httpauth_denied'];

const { t } = useI18n();

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const rowKey = 'id';
const eventOptions = EVENTS;
const categoryOptions = CATEGORIES;
const pagination = reactive({ total: 0, current: 1, pageSize: 10 });
const searchformData = reactive({ category: '', event: '', account_name: '', client_ip: '', host: '' });

function eventLabel(e: string) {
  if (!e) return '-';
  const key = `page.access.audit.event_${e}`;
  const label = t(key);
  // 后端新增事件类型而前端还没补翻译时，直接显示原始事件名而不是键名
  return label === key ? e : label;
}

function categoryLabel(c: string) {
  if (!c) return '-';
  const key = `page.access.audit.category_${c}`;
  const label = t(key);
  return label === key ? c : label;
}

// 三个分类各给一个色，混在一张表里时能一眼分开谁是谁
function categoryTheme(c: string) {
  if (c === 'config') return 'warning';
  if (c === 'httpauth') return 'primary';
  return 'default';
}

function eventTheme(e: string) {
  if (DANGER_EVENTS.includes(e)) return 'danger';
  if (WARNING_EVENTS.includes(e)) return 'warning';
  return 'primary';
}

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.access.audit.label_category'), width: 100, colKey: 'category' },
  { title: t('page.access.audit.label_event'), align: 'left', width: 140, colKey: 'event' },
  { title: t('page.access.audit.col_result'), width: 90, colKey: 'result' },
  { title: t('page.access.audit.label_account'), width: 130, ellipsis: true, colKey: 'account_name' },
  { title: t('page.access.audit.label_host'), width: 180, ellipsis: true, colKey: 'host' },
  { title: t('page.access.audit.col_url'), width: 220, ellipsis: true, colKey: 'url' },
  { title: t('page.access.audit.label_ip'), width: 140, ellipsis: true, colKey: 'client_ip' },
  { title: t('page.access.audit.col_location'), width: 140, ellipsis: true, colKey: 'location' },
  { title: t('page.access.audit.col_message'), width: 220, ellipsis: true, colKey: 'message' },
  { title: t('common.create_time'), width: 170, ellipsis: true, colKey: 'create_time' },
]);

function getList() {
  dataLoading.value = true;
  wafAccessAuditListApi({
    pageSize: pagination.pageSize,
    pageIndex: pagination.current,
    ...searchformData,
  })
    .then((res) => {
      if (res.code === 0) {
        data.value = res.data.list ?? [];
        pagination.total = res.data.total;
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => console.log(e))
    .finally(() => {
      dataLoading.value = false;
    });
}

function rehandlePageChange(curr: PageInfo) {
  pagination.current = curr.current;
  pagination.pageSize = curr.pageSize;
  getList();
}

onMounted(() => {
  getList();
});
</script>

<style scoped>
.left-operation-container {
  padding: 0 0 6px 0;
  margin-bottom: 16px;
}

.search-input {
  width: 140px;
}
</style>
