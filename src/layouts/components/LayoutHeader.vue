<template>
  <div class="layout-header">
    <t-button
      class="header-menu-btn"
      shape="square"
      variant="text"
      :aria-label="settingStore.isMobile ? 'menu' : 'collapse'"
      @click="settingStore.toggleSidebar()"
    >
      <view-list-icon />
    </t-button>

    <div class="header-spacer" />

    <!-- 搜索框（移动端隐藏） -->
    <search v-if="!settingStore.isMobile" />

    <!-- 系统监控（移动端隐藏） -->
    <system-monitor-widget v-if="!settingStore.isMobile" />

    <!-- 全局通知 -->
    <notice />

    <!-- 新版本提示 -->
    <t-tooltip v-if="hasNewVersion" placement="bottom" :content="t('topNav.update.has_new_version')">
      <t-button theme="default" shape="square" variant="text" style="position: relative; overflow: visible" @click="checkVersion('manual')">
        <notification-error-icon />
        <span v-if="updateNewVer && updateNewVer.toLowerCase().includes('beta')" class="version-badge version-badge--beta"> Beta </span>
        <span v-else class="version-badge version-badge--new"> New </span>
      </t-button>
    </t-tooltip>

    <!-- 联系我们 -->
    <t-tooltip v-if="!settingStore.isMobile" placement="bottom" :content="t('topNav.contract')">
      <t-button theme="default" shape="square" variant="text" @click="sendMail">
        <mail-icon />
      </t-button>
    </t-tooltip>
    <!-- 帮助文档 -->
    <t-tooltip placement="bottom" :content="t('topNav.help_document')">
      <t-button theme="default" shape="square" variant="text" @click="navToHelper">
        <help-circle-icon />
      </t-button>
    </t-tooltip>

    <!-- 页面配置 -->
    <t-tooltip placement="bottom" :content="t('page.right_setting.page_setting')">
      <t-button theme="default" shape="square" variant="text" @click="settingStore.showSettingPanel = true">
        <setting-icon />
      </t-button>
    </t-tooltip>

    <!-- 语言切换 -->
    <t-dropdown :options="langOptions" trigger="click" @click="onLangChange">
      <t-button shape="square" variant="text" aria-label="language">
        <translate-icon />
      </t-button>
    </t-dropdown>

    <!-- 用户菜单 -->
    <t-dropdown :options="userOptions" trigger="click" @click="onUserAction">
      <t-button variant="text" class="header-user-btn">
        <template #icon><user-circle-icon /></template>
        <span v-if="!settingStore.isMobile">{{ userStore.account || 'admin' }}</span>
      </t-button>
    </t-dropdown>

    <!-- 升级对话框 -->
    <t-dialog v-model:visible="updateVisible" width="600px" :header="t('topNav.update.has_new_version')">
      <template #confirmBtn>
        <!-- 容器环境：应用内升级会在容器重建后回退，这里不给"确认更新"，只给文档入口 -->
        <t-link
          v-if="!selfUpdateAllowed"
          theme="primary"
          underline
          href="https://doc.samwaf.com/quickstart/Update.html"
          target="_blank"
          >{{ t('topNav.update.container_doc_link') }}</t-link
        >
        <t-button
          v-else
          :theme="updateNewVer && updateNewVer.toLowerCase().includes('beta') ? 'danger' : 'warning'"
          @click="handleConfirmUpdate"
        >
          {{ t('topNav.update.confirm_update') }}
        </t-button>
      </template>

      <t-alert v-if="!selfUpdateAllowed" theme="error" :title="t('topNav.update.container_blocked_title')">
        <template #message>
          <div>{{ t('topNav.update.container_blocked_tips', { container: containerType || 'container' }) }}</div>
          <div style="margin-top: 8px">
            <strong>{{ t('topNav.update.container_howto_label') }}</strong>
          </div>
          <pre style="margin: 4px 0; padding: 8px; background: rgba(0, 0, 0, 0.05); border-radius: 4px; white-space: pre-wrap">
docker compose pull
docker compose up -d</pre
          >
          <div>{{ t('topNav.update.container_howto_tips') }}</div>
        </template>
      </t-alert>
      <t-alert v-else theme="warning">
        <template #message>
          {{ t('topNav.update.update_danger_tips') }}
        </template>
      </t-alert>
      <div style="margin: 16px 0 0 0; line-height: 1.8">
        <div>
          <strong>{{ t('topNav.update.version_label') }}</strong>
          {{ updateNewVer }}
        </div>
        <span v-if="updateNewVer && updateNewVer.toLowerCase().includes('beta')" style="color: red">
          {{ t('topNav.update.beta_version_warning') }}
        </span>

        <div>
          <strong>{{ t('topNav.update.desc_label') }}</strong>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-html="compiledMarkdown"></div>
        </div>
        <div>
          <t-link theme="primary" underline href="https://doc.samwaf.com/quickstart/Update.html" target="_blank">{{
            t('topNav.update.more_label')
          }}</t-link>
        </div>
      </div>
    </t-dialog>

    <!-- 升级进度：弹窗内联展示 + 后台运行悬浮球，独立于上面的"有新版本"弹窗存活 -->
    <update-progress ref="updateProgressRef" @retry="handleDoUpdate" @open-rollback="openRollbackDialog" />

    <!-- 版本回退对话框 -->
    <t-dialog v-model:visible="rollbackVisible" width="680px" header="版本回退" :confirm-btn="null" :cancel-btn="null">
      <t-alert theme="warning" style="margin-bottom: 16px">
        <template #message>回退后服务将自动重启，请确认操作</template>
      </t-alert>
      <div v-if="rollbackLoading" style="text-align: center; padding: 24px; color: #646a73">加载中...</div>
      <t-table
        v-else
        :data="rollbackList"
        :columns="rollbackColumns"
        row-key="file_name"
        size="small"
        :selected-row-keys="rollbackSelected ? [rollbackSelected.file_name] : []"
        select-on-row-click
        @select-change="onRollbackSelect"
      >
        <template #backup_time="{ row }">
          <span>{{ new Date(row.backup_time).toLocaleString('zh-CN') }}</span>
        </template>
        <template #file_size="{ row }">
          <span>{{ (row.file_size / 1024 / 1024).toFixed(2) }} MB</span>
        </template>
      </t-table>
      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px">
        <t-button theme="default" @click="rollbackVisible = false">取消</t-button>
        <t-button theme="danger" :disabled="!rollbackSelected || isRollbackLoading" :loading="isRollbackLoading" @click="handleConfirmRollback">
          确认回退到 {{ rollbackSelected ? rollbackSelected.version : '' }}
        </t-button>
      </div>
    </t-dialog>

    <!-- 个人自助修改密码 -->
    <change-password-dialog v-model:visible="showChangePwd" :forced="false" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import type { DropdownProps, TableProps } from 'tdesign-vue-next';
import {
  HelpCircleIcon,
  MailIcon,
  NotificationErrorIcon,
  SettingIcon,
  TranslateIcon,
  UserCircleIcon,
  ViewListIcon,
} from 'tdesign-icons-vue-next';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

import { useUserStore } from '@/store/modules/user';
import { useSettingStore } from '@/store/modules/setting';
import { CheckVersionApi, DoRollbackApi, DoUpdateApi, GetRollbackListApi } from '@/apis/sysinfo';
import { resetWAFApi } from '@/apis/common';
import { getOnlineUrl } from '@/utils/usuallytool';
import Notice from './Notice.vue';
import Search from './Search.vue';
import SystemMonitorWidget from './SystemMonitorWidget.vue';
import UpdateProgress from './UpdateProgress.vue';
import ChangePasswordDialog from '@/pages/waf/account/components/ChangePasswordDialog.vue';

const router = useRouter();
const { t, locale } = useI18n();
const userStore = useUserStore();
const settingStore = useSettingStore();

/** 更新内容 */
const hasNewVersion = ref(false);
const isUpdateloading = ref(false);
const updateVisible = ref(false);
const updateNewVer = ref('');
const updateDesc = ref('');
/** 运行环境：容器类型(空=非容器)与是否允许应用内升级。
 * 容器里升级只对当前容器有效，容器重建就回退到镜像版本，而数据库回不去，
 * 所以容器环境下后端会直接拒绝升级，前端这里换成镜像更新指引。 */
const containerType = ref('');
const selfUpdateAllowed = ref(true);
/** 版本回退 */
const rollbackVisible = ref(false);
const rollbackLoading = ref(false);
const isRollbackLoading = ref(false);
const rollbackList = ref<Record<string, any>[]>([]);
const rollbackSelected = ref<Record<string, any> | null>(null);
const isResetloading = ref(false);

const rollbackColumns = computed<TableProps['columns']>(() => [
  { colKey: 'row-select', type: 'single', width: 48 },
  { colKey: 'version', title: '版本', width: 120 },
  { colKey: 'backup_time', title: '备份时间', width: 180 },
  { colKey: 'file_size', title: '大小', width: 90 },
  { colKey: 'file_name', title: '文件名' },
]);

const langOptions: DropdownProps['options'] = [
  { content: '简体中文', value: 'zh_CN' },
  { content: 'English', value: 'en_US' },
];

const userOptions = computed<DropdownProps['options']>(() => [
  { content: t('topNav.dropdown_change_password'), value: 'changepwd' },
  { content: t('topNav.dropdown_update'), value: 'update' },
  { content: '版本回退', value: 'rollback' },
  { content: t('topNav.dropdown_reboot_waf'), value: 'reboot', disabled: isResetloading.value },
  { content: t('topNav.dropdown_logout'), value: 'logout' },
]);

/** 个人自助修改密码 */
const showChangePwd = ref(false);
/** 升级进度面板（弹窗 + 悬浮球） */
const updateProgressRef = ref<InstanceType<typeof UpdateProgress> | null>(null);

const compiledMarkdown = computed(() => DOMPurify.sanitize(marked.parse(updateDesc.value || '') as string));

onMounted(() => {
  // 首次提示，每隔24小时进行弹窗，其余实际不弹窗
  checkVersion('auto');
  // 升级中刷新了页面：把进度捡回来，别让用户以为升级断了
  updateProgressRef.value?.resume();
});

function onLangChange(data: { value?: string | number }) {
  const lang = String(data.value);
  locale.value = lang;
  localStorage.setItem('lang', lang);
  window.location.reload();
}

async function onUserAction(data: { value?: string | number }) {
  switch (data.value) {
    case 'changepwd':
      showChangePwd.value = true;
      break;
    case 'update':
      checkVersion('manual');
      break;
    case 'rollback':
      openRollbackDialog();
      break;
    case 'reboot':
      resetServer();
      break;
    case 'logout':
      await userStore.logout();
      router.replace({ path: '/login' });
      break;
    default:
      break;
  }
}

function navToHelper() {
  window.open(getOnlineUrl());
}

function sendMail() {
  window.location.href = 'mailto:samwafgo@gmail.com';
}

function resetServer() {
  isResetloading.value = true;
  resetWAFApi()
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        setTimeout(() => {
          isResetloading.value = false;
        }, 3000);
      } else {
        MessagePlugin.warning(res.msg);
        isResetloading.value = false;
      }
    })
    .catch((e: Error) => {
      console.log(e);
      isResetloading.value = false;
    });
}

function checkVersion(method: 'auto' | 'manual') {
  CheckVersionApi()
    .then((res) => {
      if (res.code === 0) {
        hasNewVersion.value = true;
        updateNewVer.value = res.data.version_new;
        updateDesc.value = res.data.version_desc;
        containerType.value = res.data.container || '';
        // 老后端没有这个字段时按"允许"处理，避免升级入口被误屏蔽
        selfUpdateAllowed.value = res.data.self_update_allowed !== false;
        if (method === 'manual') {
          updateVisible.value = true;
        } else {
          // 从本地存储获取上次显示弹窗的时间
          const lastUpdatePopupTime = localStorage.getItem('lastUpdatePopupTime');
          // 如果是beta版本，不自动弹出提示
          if (updateNewVer.value && updateNewVer.value.toLowerCase().includes('beta')) {
            hasNewVersion.value = true;
          } else if (!lastUpdatePopupTime || Date.now() - Number(lastUpdatePopupTime) > 24 * 60 * 60 * 1000) {
            // 如果上次显示时间不存在或距离当前时间超过24小时，则显示弹窗
            updateVisible.value = true;
            localStorage.setItem('lastUpdatePopupTime', String(Date.now()));
          }
        }
      } else if (method === 'manual') {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch(() => {
      if (method === 'manual') {
        MessagePlugin.warning('检测版本异常，请检测网络');
      }
    });
}

function handleConfirmUpdate() {
  // 如果是beta版本，需要二次确认
  if (updateNewVer.value && updateNewVer.value.toLowerCase().includes('beta')) {
    const confirmDia = DialogPlugin.confirm({
      header: t('topNav.update.beta_confirm_title') || '确认更新测试版本',
      body: t('topNav.update.beta_confirm_content') || '您正在更新测试版本，该版本可能不稳定，确定要继续吗？',
      confirmBtn: {
        theme: 'danger',
        content: t('topNav.update.beta_confirm_yes') || '确认更新',
      },
      cancelBtn: {
        theme: 'default',
        content: t('topNav.update.beta_confirm_no') || '取消',
      },
      onConfirm: () => {
        handleDoUpdate();
        confirmDia.destroy();
      },
    });
  } else {
    // 非beta版本直接更新
    handleDoUpdate();
  }
}

function handleDoUpdate() {
  // 容器环境后端会直接拒绝，这里先拦一道，避免无谓请求和误导性的 loading
  if (!selfUpdateAllowed.value) {
    MessagePlugin.warning(t('topNav.update.container_blocked_title'));
    return;
  }
  isUpdateloading.value = true;
  // 检查是否为beta版本，如果是则添加渠道参数
  const params = updateNewVer.value && updateNewVer.value.toLowerCase().includes('beta') ? { channel: 'github' } : { channel: 'official' };

  DoUpdateApi(params)
    .then((res) => {
      if (res.code === 0) {
        // 弹窗不再一关了之：换成进度面板，用户能看见跑到哪一步
        updateVisible.value = false;
        isUpdateloading.value = false;
        updateProgressRef.value?.start();
      } else {
        MessagePlugin.warning(res.msg);
        isUpdateloading.value = false;
      }
    })
    .catch((e: Error) => {
      isUpdateloading.value = false;
      console.log(e);
    });
}

function openRollbackDialog() {
  rollbackVisible.value = true;
  rollbackSelected.value = null;
  rollbackLoading.value = true;
  GetRollbackListApi()
    .then((res) => {
      if (res.code === 0) {
        rollbackList.value = res.data || [];
      } else {
        MessagePlugin.warning(res.msg || '获取备份列表失败');
      }
    })
    .catch(() => {
      MessagePlugin.warning('获取备份列表失败');
    })
    .finally(() => {
      rollbackLoading.value = false;
    });
}

function onRollbackSelect(_selectedKeys: any[], context: { selectedRowData: any[] }) {
  rollbackSelected.value = context.selectedRowData[0] || null;
}

function handleConfirmRollback() {
  if (!rollbackSelected.value) return;
  const target = rollbackSelected.value;
  const dia = DialogPlugin.confirm({
    header: '确认回退版本',
    body: `确定将程序回退到版本 ${target.version}？\n回退后服务将自动重启，请耐心等待。`,
    confirmBtn: { theme: 'danger', content: '确认回退' },
    onConfirm: () => {
      isRollbackLoading.value = true;
      DoRollbackApi({ version: target.version })
        .then((res) => {
          if (res.code === 0) {
            MessagePlugin.success(res.msg || '已发起回退，等待重启通知');
            rollbackVisible.value = false;
          } else {
            MessagePlugin.warning(res.msg || '回退失败');
          }
        })
        .catch(() => {
          MessagePlugin.warning('回退请求失败');
        })
        .finally(() => {
          isRollbackLoading.value = false;
        });
      dia.destroy();
    },
  });
}
</script>

<style scoped>
.layout-header {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 100%;
  padding: 0 16px;
}

.header-spacer {
  flex: 1;
}

/* 方形图标按钮：统一 36px 圆角方块 + 精致 hover */
.layout-header :deep(.t-button--shape-square) {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.15s ease;
}

.layout-header :deep(.t-icon) {
  font-size: 18px;
}

/* 用户入口：胶囊 */
.header-user-btn {
  max-width: 160px;
  height: 36px;
  padding: 0 12px;
  border-radius: 18px;
  border: 1px solid var(--td-component-stroke);
  margin-left: 8px;
}

.version-badge {
  position: absolute;
  top: -6px;
  right: -18px;
  font-size: 10px;
  color: white;
  border-radius: 8px;
  padding: 0 4px;
  line-height: 16px;
  font-weight: bold;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
  z-index: 10;
}

.version-badge--beta {
  background: #ff4d4f;
}

.version-badge--new {
  background: #52c41a;
}

</style>
