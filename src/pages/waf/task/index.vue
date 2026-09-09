<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container"></div>
        <div class="right-operation-container">
          <t-form ref="searchForm" :data="searchformData" :label-width="300" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList('all')">
                {{ t('common.search') }}
              </t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>
      <help-block :summary="t('page.task.alert_message')" doc="guide/Task" />
      <div class="table-container">
        <t-table
          :columns="columns"
          :data="data"
          :row-key="rowKey"
          vertical-align="top"
          hover
          :pagination="pagination"
          :selected-row-keys="selectedRowKeys"
          :loading="dataLoading"
          @page-change="rehandlePageChange"
          @select-change="rehandleSelectChange"
        >
          <template #task_unit="{ row }">
            <p>
              {{ task_unit_type.find((option) => option.value === row.task_unit)?.label || row.task_unit }}
            </p>
          </template>
          <template #op="slotProps">
            <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.edit') }}</a>
            <a class="t-button-link" @click="handleManual(slotProps)">{{ t('page.task.button_manual_execute') }}</a>
            <a class="t-button-link" @click="handleViewLog(slotProps)">{{ t('page.task.button_view_log') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="680" :footer="false">
      <t-form ref="editForm" :data="formEditData" :rules="rules" :label-width="100" @submit="onSubmitEdit">
        <t-form-item :label="t('page.task.task_name')" name="task_name">
          <t-input
            v-model="formEditData.task_name"
            :style="{ width: '480px' }"
            :placeholder="t('common.placeholder') + t('page.task.task_name')"
          ></t-input>
        </t-form-item>

        <t-form-item :label="t('page.task.task_unit')" name="task_unit">
          <t-select
            v-model="formEditData.task_unit"
            :style="{ width: '480px' }"
            :placeholder="t('common.select') + t('page.task.task_unit')"
          >
            <t-option v-for="item in task_unit_type" :key="item.value" :value="item.value" :label="item.label">
              {{ item.label }}
            </t-option>
          </t-select>
        </t-form-item>

        <t-form-item :label="t('page.task.task_value')" name="task_value">
          <t-input-number
            v-model="formEditData.task_value"
            :style="{ width: '480px' }"
            :placeholder="t('common.placeholder') + t('page.task.task_value')"
          >
          </t-input-number>
        </t-form-item>

        <t-form-item :label="t('page.task.task_at')" name="task_at">
          <t-input v-model="formEditData.task_at" :style="{ width: '480px' }" :placeholder="t('page.task.task_at_placeholder')"></t-input>
        </t-form-item>

        <t-form-item :label="t('page.task.task_method')" name="task_method">
          <t-select
            v-model="formEditData.task_method"
            :style="{ width: '480px' }"
            :placeholder="t('common.select') + t('page.task.task_method')"
            filterable
            disabled
          >
            <t-option v-for="item in task_method_type" :key="item.value" :value="item.value" :label="item.label">
              {{ item.label }}
            </t-option>
          </t-select>
        </t-form-item>

        <t-form-item v-if="formEditData.task_unit === 'weekly'" :label="t('page.task.task_days_of_week')" name="task_days_of_the_week">
          <t-select
            v-model="formEditData.task_days_of_the_week"
            :style="{ width: '480px' }"
            :placeholder="t('common.select') + t('page.task.task_days_of_week')"
          >
            <t-option v-for="item in week_days_type" :key="item.value" :value="item.value" :label="item.label">
              {{ item.label }}
            </t-option>
          </t-select>
        </t-form-item>

        <t-form-item style="float: right">
          <t-button variant="outline" @click="onClickCloseEditBtn">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 任务日志对话框 -->
    <t-dialog
      v-model:visible="logDialogVisible"
      :header="t('page.task.log_dialog_title') + ' - ' + logCurrentTaskName"
      :width="900"
      :footer="false"
      @close="onLogDialogClose"
    >
      <div style="margin-bottom: 10px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap">
        <t-tag v-if="logFilePath" theme="default" variant="outline" size="small">{{ logFilePath }}</t-tag>
        <div style="margin-left: auto; display: flex; align-items: center; gap: 8px">
          <t-switch v-model="logAutoRefresh" @change="onAutoRefreshChange">
            <template #label="{ value }">{{ value ? t('page.task.log_auto_refresh_on') : t('page.task.log_auto_refresh') }}</template>
          </t-switch>
          <t-button size="small" theme="default" @click="loadLog(true)">{{ t('page.task.log_refresh') }}</t-button>
          <t-button size="small" theme="danger" variant="outline" @click="handleClearLog">{{ t('page.task.log_clear') }}</t-button>
        </div>
      </div>
      <div ref="logContainer" class="log-container">
        <pre v-if="logContent" class="log-content">{{ logContent }}</pre>
        <div v-else class="log-empty">{{ t('page.task.log_empty') }}</div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import type { FormProps, PageInfo, TableProps } from 'tdesign-vue-next';

import {
  wafTaskDetailApi,
  wafTaskEditApi,
  wafTaskListApi,
  wafTaskLogApi,
  wafTaskLogClearApi,
  wafTaskManualExecApi,
} from '@/apis/task';
import { getOnlineUrl } from '@/utils/usuallytool';

const { t } = useI18n();

const INITIAL_DATA = {
  task_name: '',
  task_unit: '',
  task_value: '',
  task_at: '',
  task_method: '',
  task_days_of_the_week: '',
};

const editFormVisible = ref(false);
const formEditData = ref<Record<string, any>>({ ...INITIAL_DATA });

const rules: FormProps['rules'] = {
  task_name: [{ required: true, message: t('common.placeholder') + t('page.task.task_name'), type: 'error' }],
  task_unit: [{ required: true, message: t('common.select') + t('page.task.task_unit'), type: 'error' }],
  task_value: [{ required: true, message: t('common.placeholder') + t('page.task.task_value'), type: 'error' }],
  task_method: [{ required: true, message: t('common.select') + t('page.task.task_method'), type: 'error' }],
};

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);
const rowKey = 'code';
const searchformData = reactive({});

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.task.task_name'), width: 300, ellipsis: true, colKey: 'task_name' },
  { title: t('page.task.task_unit'), width: 150, ellipsis: true, colKey: 'task_unit' },
  { title: t('page.task.task_value'), width: 150, ellipsis: true, colKey: 'task_value' },
  { title: t('page.task.task_at'), width: 200, ellipsis: true, colKey: 'task_at' },
  { title: t('page.task.task_method'), width: 200, ellipsis: true, colKey: 'task_method' },
  { title: t('page.task.task_days_of_week'), width: 150, ellipsis: true, colKey: 'task_days_of_the_week' },
  { align: 'left', fixed: 'right', width: 280, colKey: 'op', title: t('common.op') },
]);

// 间隔单位转换
const task_unit_type = computed(() => [
  { label: t('page.task.task_unit_type.second'), value: 'second' },
  { label: t('page.task.task_unit_type.minute'), value: 'minute' },
  { label: t('page.task.task_unit_type.hour'), value: 'hour' },
  { label: t('page.task.task_unit_type.day'), value: 'day' },
  { label: t('page.task.task_unit_type.weekly'), value: 'weekly' },
]);

// 任务方法类型
const task_method_type = computed(() => [
  { label: t('page.task.task_method_type.runtime_qps_clean'), value: 'task_runtime_qps_clean' },
  { label: t('page.task.task_method_type.host_qps_clean'), value: 'task_host_qps_clean' },
  { label: t('page.task.task_method_type.share_db'), value: 'task_share_db' },
  { label: t('page.task.task_method_type.counter'), value: 'task_counter' },
  { label: t('page.task.task_method_type.delay_info'), value: 'task_delay_info' },
  { label: t('page.task.task_method_type.load_config'), value: 'task_load_config' },
  { label: t('page.task.task_method_type.delete_history_info'), value: 'task_delete_history_info' },
  { label: t('page.task.task_method_type.delete_history_download_file'), value: 'task_delete_history_download_file' },
  { label: t('page.task.task_method_type.ssl_order_renew'), value: 'task_ssl_order_renew' },
  { label: t('page.task.task_method_type.ssl_path_load'), value: 'task_ssl_path_load' },
  { label: t('page.task.task_method_type.batch'), value: 'task_batch' },
  { label: t('page.task.task_method_type.ssl_expire_check'), value: 'task_ssl_expire_check' },
  { label: t('page.task.task_method_type.notice'), value: 'task_notice' },
  { label: t('page.task.task_method_type.health'), value: 'task_health' },
  { label: t('page.task.task_method_type.clear_cc_windows'), value: 'task_clear_cc_windows' },
  { label: t('page.task.task_method_type.clear_webcache'), value: 'task_clear_webcache' },
  { label: t('page.task.task_method_type.gc'), value: 'task_gc' },
  { label: t('page.task.task_method_type.stats_push'), value: 'task_stats_push' },
  { label: t('page.task.task_method_type.db_monitor'), value: 'task_db_monitor' },
  { label: t('page.task.task_method_type.firewall_clean_expired'), value: 'task_firewall_clean_expired' },
]);

// 星期选项
const week_days_type = computed(() => [
  { label: t('page.task.week_days.sunday'), value: '0' },
  { label: t('page.task.week_days.monday'), value: '1' },
  { label: t('page.task.week_days.tuesday'), value: '2' },
  { label: t('page.task.week_days.wednesday'), value: '3' },
  { label: t('page.task.week_days.thursday'), value: '4' },
  { label: t('page.task.week_days.friday'), value: '5' },
  { label: t('page.task.week_days.saturday'), value: '6' },
]);

const pagination = reactive({
  total: 0,
  current: 1,
  pageSize: 10,
});

// 任务日志
const logDialogVisible = ref(false);
const logCurrentTaskMethod = ref('');
const logCurrentTaskName = ref('');
const logContent = ref('');
const logFilePath = ref('');
const logOffset = ref(0);
const logAutoRefresh = ref(false);
let logRefreshTimer: ReturnType<typeof setInterval> | null = null;
const logLoading = ref(false);
const logContainer = ref<HTMLElement>();

onMounted(() => {
  getList('');
});

onBeforeUnmount(() => {
  if (logRefreshTimer) {
    clearInterval(logRefreshTimer);
    logRefreshTimer = null;
  }
});

function getList(keyword?: string) {
  if (keyword === 'all') {
    pagination.current = 1;
  }
  dataLoading.value = true;
  wafTaskListApi({
    pageSize: pagination.pageSize,
    pageIndex: pagination.current,
    ...searchformData,
  })
    .then((res) => {
      if (res.code === 0) {
        data.value = res.data.list ?? [];
        pagination.total = res.data.total;
      }
    })
    .catch((e: Error) => {
      console.log(e);
    })
    .finally(() => {
      dataLoading.value = false;
    });
}

function rehandlePageChange(curr: PageInfo) {
  pagination.current = curr.current;
  if (pagination.pageSize !== curr.pageSize) {
    pagination.current = 1;
    pagination.pageSize = curr.pageSize;
  }
  getList('');
}

function rehandleSelectChange(val: (string | number)[]) {
  selectedRowKeys.value = val;
}

function handleManual(e: { row: Record<string, any> }) {
  const { id } = e.row;
  wafTaskManualExecApi({ id })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e2: Error) => {
      console.log(e2);
    });
}

function handleClickEdit(e: { row: Record<string, any> }) {
  const { id } = e.row;
  editFormVisible.value = true;
  getDetail(id);
}

const onSubmitEdit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    const postdata: Record<string, any> = { ...formEditData.value };
    postdata.task_value = Number(postdata.task_value);

    // 如果不是weekly类型，清空task_days_of_the_week
    if (postdata.task_unit !== 'weekly') {
      postdata.task_days_of_the_week = '';
    }

    wafTaskEditApi(postdata)
      .then((res) => {
        if (res.code === 0) {
          MessagePlugin.success(res.msg);
          editFormVisible.value = false;
          getList('');
        } else {
          MessagePlugin.warning(res.msg);
        }
      })
      .catch((e: Error) => {
        console.log(e);
      });
  } else {
    MessagePlugin.warning(firstError);
  }
};

function onClickCloseEditBtn() {
  editFormVisible.value = false;
  formEditData.value = { ...INITIAL_DATA };
}

function getDetail(id: string | number) {
  wafTaskDetailApi({ id })
    .then((res) => {
      if (res.code === 0) {
        const detail = res.data;
        detail.task_value = detail.task_value.toString();
        formEditData.value = { ...detail };
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}


// 查看任务日志
function handleViewLog(e: { row: Record<string, any> }) {
  const { task_method, task_name } = e.row;
  logCurrentTaskMethod.value = task_method;
  logCurrentTaskName.value = task_name || task_method;
  logContent.value = '';
  logFilePath.value = '';
  logOffset.value = 0;
  logAutoRefresh.value = false;
  logDialogVisible.value = true;
  nextTick(() => {
    loadLog(true);
  });
}

// 加载日志（reset=true 表示全量加载，false 表示增量加载）
function loadLog(reset: boolean) {
  if (!logCurrentTaskMethod.value || logLoading.value) return;
  logLoading.value = true;
  const offset = reset ? 0 : logOffset.value;
  wafTaskLogApi({
    task_method: logCurrentTaskMethod.value,
    lines: 500,
    offset,
  })
    .then((res) => {
      if (res.code === 0) {
        const logData = res.data;
        logFilePath.value = logData.log_file || '';
        logOffset.value = logData.new_offset || 0;
        if (reset) {
          logContent.value = logData.content || '';
        } else if (logData.content) {
          logContent.value += logData.content;
        }
        nextTick(() => {
          if (logContainer.value) {
            logContainer.value.scrollTop = logContainer.value.scrollHeight;
          }
        });
      }
    })
    .catch((e: Error) => {
      console.log(e);
    })
    .finally(() => {
      logLoading.value = false;
    });
}

// 自动刷新开关
function onAutoRefreshChange(val: any) {
  if (val) {
    logRefreshTimer = setInterval(() => {
      loadLog(false);
    }, 5000);
  } else if (logRefreshTimer) {
    clearInterval(logRefreshTimer);
    logRefreshTimer = null;
  }
}

// 清空任务日志
function handleClearLog() {
  wafTaskLogClearApi({ task_method: logCurrentTaskMethod.value })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        logContent.value = '';
        logOffset.value = 0;
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

// 关闭日志对话框时清理定时器
function onLogDialogClose() {
  if (logRefreshTimer) {
    clearInterval(logRefreshTimer);
    logRefreshTimer = null;
  }
  logAutoRefresh.value = false;
}
</script>

<style scoped>
.left-operation-container {
  padding: 0 0 6px 0;
  margin-bottom: 16px;
}

.search-input {
  width: 360px;
}

.log-container {
  height: 480px;
  overflow-y: auto;
  background: #1a1a1a;
  border-radius: 4px;
  padding: 12px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #d4d4d4;
  white-space: pre-wrap;
  word-break: break-all;
}

.log-container .log-content {
  margin: 0;
  color: #d4d4d4;
  font-family: inherit;
  font-size: inherit;
}

.log-container .log-empty {
  color: #888;
  text-align: center;
  padding-top: 60px;
}
</style>
