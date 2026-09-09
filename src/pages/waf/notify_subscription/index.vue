<template>
  <div>
    <t-card class="list-card-container">
      <div class="page-header">
        <div class="page-header-main">
          <h3>{{ t('page.notify_subscription.page_title') }}</h3>
          <p class="page-desc">{{ t('page.notify_subscription.alert_message') }}</p>
        </div>
        <t-button variant="outline" @click="globalDialogVisible = true">
          <setting-icon /> {{ t('page.notify_subscription.button_global_config') }}
        </t-button>
      </div>

      <t-loading :loading="dataLoading" size="large">
        <t-table :data="tableData" :columns="tableColumns" row-key="messageType" bordered hover table-layout="auto">
          <!-- 消息类型列 -->
          <template #messageType="{ row }">
            <div class="message-type-cell">
              <div class="message-type-name">{{ row.messageTypeName }}</div>
            </div>
          </template>

          <!-- 各渠道表头（批量操作下拉） -->
          <template v-for="ct in channelTypes" :key="`${ct.type}-title`" #[`${ct.type}-title`]>
            <div class="channel-header-wrapper">
              <t-tag :theme="ct.theme" size="small">{{ ct.name }}</t-tag>
              <t-dropdown :min-column-width="120">
                <t-button variant="text" size="small" shape="square">
                  <ellipsis-icon />
                </t-button>
                <t-dropdown-menu>
                  <t-dropdown-item @click="handleBatchAdd(ct.type)">
                    <add-icon /> {{ t('page.notify_subscription.batch_action_add') }}
                  </t-dropdown-item>
                  <t-dropdown-item @click="handleBatchEnable(ct.type)">
                    <check-circle-icon /> {{ t('page.notify_subscription.batch_action_enable') }}
                  </t-dropdown-item>
                  <t-dropdown-item @click="handleBatchDisable(ct.type)">
                    <close-circle-icon /> {{ t('page.notify_subscription.batch_action_disable') }}
                  </t-dropdown-item>
                  <t-dropdown-item @click="handleBatchConfig(ct.type)">
                    <setting-icon /> {{ t('page.notify_subscription.batch_action_config') }}
                  </t-dropdown-item>
                  <t-dropdown-item @click="handleBatchDelete(ct.type)">
                    <delete-icon /> {{ t('page.notify_subscription.batch_action_delete') }}
                  </t-dropdown-item>
                </t-dropdown-menu>
              </t-dropdown>
            </div>
          </template>

          <!-- 各渠道单元格 -->
          <template v-for="ct in channelTypes" :key="ct.type" #[ct.type]="{ row }">
            <div class="channel-cell-content">
              <div v-for="channel in row.channels[ct.type]" :key="channel.id" class="channel-item-inline">
                <div v-if="!channel.subscription" class="add-btn-inline">
                  <t-button
                    size="small"
                    variant="dashed"
                    :disabled="channel.status === 0"
                    @click="handleAddSubscription(row.messageType, channel)"
                  >
                    <add-icon size="14px" />
                    {{ channel.name }}
                  </t-button>
                </div>
                <div v-else class="subscription-inline">
                  <t-switch
                    :value="channel.subscription.status === 1"
                    :disabled="channel.status === 0"
                    size="small"
                    @change="(val: any) => handleChannelToggle(row.messageType, channel, Boolean(val))"
                  />
                  <div class="channel-info-inline">
                    <span class="channel-name">{{ channel.name }}</span>
                    <template v-if="ct.type === 'email'">
                      <span v-if="channel.subscription.recipients" class="channel-detail">{{ channel.subscription.recipients }}</span>
                      <a class="edit-link-inline" @click="handleEditRecipients(row.messageType, channel)">修改</a>
                    </template>
                    <!-- 配置摘要：只显示改过的项，一眼看出哪个格子被单独配过 -->
                    <span class="config-summary" :title="configSummary(channel.subscription)">
                      {{ configSummary(channel.subscription) }}
                    </span>
                  </div>
                  <t-tooltip :content="t('page.notify_subscription.config_title')">
                    <setting-icon size="16px" class="config-icon-inline" @click="handleOpenConfig(row.messageType, channel)" />
                  </t-tooltip>
                  <close-circle-filled-icon
                    size="16px"
                    class="delete-icon-inline"
                    @click="handleDeleteSubscription(row.messageType, channel.id)"
                  />
                </div>
              </div>
            </div>
          </template>
        </t-table>
      </t-loading>
    </t-card>

    <!-- 单个订阅的精细化配置（频控/模板/过滤/测试） -->
    <config-drawer
      v-model:visible="configDrawerVisible"
      :subscription="configSubscription"
      :channel-name="configChannelName"
      :channel-type="configChannelType"
      :message-type-name="configMessageTypeName"
      @saved="loadSubscriptionList"
    />

    <!-- 按渠道类型批量套用频控配置 -->
    <batch-config-dialog
      v-model:visible="batchConfigVisible"
      :channel-type="batchConfigChannelType"
      :channel-label="batchConfigChannelName"
      @saved="loadSubscriptionList"
    />

    <!-- 全局默认频控配置 -->
    <global-throttle-dialog v-model:visible="globalDialogVisible" />

    <!-- 邮箱收件人配置对话框 -->
    <t-dialog
      v-model:visible="emailDialogVisible"
      :header="'配置邮件收件人 - ' + getChannelName(emailFormData.channel_id)"
      :width="600"
      :footer="false"
    >
      <t-form ref="emailForm" :data="emailFormData" :label-width="120" @submit="onEmailSubmit">
        <t-form-item :label="t('page.notify_subscription.label_message_type')">
          <t-tag theme="primary">{{ getMessageTypeName(emailFormData.message_type) }}</t-tag>
        </t-form-item>
        <t-form-item :label="t('page.notify_subscription.label_recipients')" name="recipients">
          <t-input
            v-model="emailFormData.recipients"
            :style="{ width: '100%' }"
            :placeholder="t('page.notify_subscription.recipients_placeholder')"
          />
          <div style="font-size: 12px; color: #666; margin-top: 4px">
            💡 <b>可选</b>：为此订阅单独指定收件人（多个邮箱用逗号分隔），不填则用渠道默认值
          </div>
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="onEmailDialogClose">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 删除确认对话框 -->
    <t-dialog
      v-model:visible="confirmVisible"
      :header="t('common.confirm_delete')"
      :body="confirmBody"
      :on-cancel="onCancel"
      @confirm="onConfirmDelete"
    >
    </t-dialog>

    <!-- 批量操作确认对话框 -->
    <t-dialog
      v-model:visible="batchConfirmVisible"
      :header="
        batchConfirmType === 'delete'
          ? t('page.notify_subscription.batch_delete_confirm', { channel: batchConfirmChannelName })
          : t('page.notify_subscription.batch_disable_confirm', { channel: batchConfirmChannelName })
      "
      :body="
        batchConfirmType === 'delete'
          ? t('page.notify_subscription.batch_delete_confirm_content')
          : t('page.notify_subscription.batch_disable_confirm_content')
      "
      :confirm-btn="t('common.confirm')"
      :cancel-btn="t('common.cancel')"
      @confirm="onBatchConfirm"
    >
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import type { FormProps, TableProps } from 'tdesign-vue-next';
import {
  AddIcon,
  CheckCircleIcon,
  CloseCircleFilledIcon,
  CloseCircleIcon,
  DeleteIcon,
  EllipsisIcon,
  SettingIcon,
} from 'tdesign-icons-vue-next';

import {
  addNotifySubscription,
  deleteNotifySubscription,
  editNotifySubscription,
  getNotifySubscriptionList,
} from '@/apis/notify_subscription';
import { getNotifyChannelList } from '@/apis/notify_channel';
import BatchConfigDialog from './components/BatchConfigDialog.vue';
import ConfigDrawer from './components/ConfigDrawer.vue';
import GlobalThrottleDialog from './components/GlobalThrottleDialog.vue';

const { t } = useI18n();

const dataLoading = ref(false);
const channelList = ref<Record<string, any>[]>([]);
const subscriptionList = ref<Record<string, any>[]>([]);

const channelTypes: { type: string; name: string; theme: 'primary' | 'success' | 'warning' | 'danger' }[] = [
  { type: 'dingtalk', name: '钉钉', theme: 'primary' },
  { type: 'feishu', name: '飞书', theme: 'success' },
  { type: 'email', name: '邮箱', theme: 'warning' },
  { type: 'serverchan', name: 'Server酱', theme: 'danger' },
  { type: 'webhook', name: '自定义Webhook', theme: 'success' },
];

const messageTypes = computed(() => [
  { type: 'user_login', name: t('page.notify_subscription.message_type_user_login') },
  { type: 'rule_trigger', name: t('page.notify_subscription.message_type_rule_trigger') },
  { type: 'ip_ban', name: t('page.notify_subscription.message_type_ip_ban') },
  { type: 'attack_info', name: t('page.notify_subscription.message_type_attack_info') },
  { type: 'ssl_expire', name: t('page.notify_subscription.message_type_ssl_expire') },
  { type: 'weekly_report', name: t('page.notify_subscription.message_type_weekly_report') },
  { type: 'system_error', name: t('page.notify_subscription.message_type_system_error') },
  { type: 'operation_notice', name: t('page.notify_subscription.message_type_operation_notice') },
  // 统一访问认证拆成两类：登录成功是日常告知，异常是安全告警。
  // 合成一类的话，只想收告警的人会被每次正常登录打扰，最后干脆退订，告警也就收不到了。
  { type: 'access_login', name: t('page.notify_subscription.message_type_access_login') },
  { type: 'access_abnormal', name: t('page.notify_subscription.message_type_access_abnormal') },
  // 管理端登录来源变化：同理和 user_login 拆开，只想收"可能是别人登进来了"的人不必订阅日常登录
  { type: 'manage_login_abnormal', name: t('page.notify_subscription.message_type_manage_login_abnormal') },
]);

const emailDialogVisible = ref(false);
const emailFormData = ref<Record<string, any>>({
  subscription_id: '',
  message_type: '',
  channel_id: '',
  recipients: '',
  status: 1,
});
const confirmVisible = ref(false);
const confirmBody = ref('');
const formEditData = ref<Record<string, any>>({});
// 批量操作确认对话框
const batchConfirmVisible = ref(false);
const batchConfirmType = ref(''); // 'delete' or 'disable'
const batchConfirmChannelType = ref('');
const batchConfirmChannelName = ref('');

// 精细化配置（issue #822）
const configDrawerVisible = ref(false);
const configSubscription = ref<Record<string, any>>({});
const configChannelName = ref('');
const configChannelType = ref('');
const configMessageTypeName = ref('');
const batchConfigVisible = ref(false);
const batchConfigChannelType = ref('');
const batchConfigChannelName = ref('');
const globalDialogVisible = ref(false);

const tableColumns = computed<TableProps['columns']>(() => {
  const columns: any[] = [
    {
      colKey: 'messageType',
      title: t('page.notify_subscription.label_message_type'),
      width: 200,
      fixed: 'left',
    },
  ];
  // 动态添加渠道类型列
  channelTypes.forEach((channelType) => {
    columns.push({
      colKey: channelType.type,
      title: `${channelType.type}-title`, // 指定title slot名称
      minWidth: 200,
    });
  });
  return columns;
});

const tableData = computed(() => {
  return messageTypes.value.map((msgType) => {
    const row: Record<string, any> = {
      messageType: msgType.type,
      messageTypeName: msgType.name,
      channels: {},
    };
    // 为每个渠道类型收集该类型的所有渠道及其订阅状态
    channelTypes.forEach((channelType) => {
      const channelsOfType = channelList.value
        .filter((ch) => ch.type === channelType.type)
        .map((channel) => {
          const subscription = subscriptionList.value.find(
            (sub) => sub.message_type === msgType.type && sub.channel_id === channel.id,
          );
          return {
            ...channel,
            subscription: subscription || null,
          };
        });
      row.channels[channelType.type] = channelsOfType;
    });
    return row;
  });
});

onMounted(() => {
  loadData();
});

async function loadData() {
  dataLoading.value = true;
  try {
    await Promise.all([loadChannelList(), loadSubscriptionList()]);
  } catch (e) {
    console.error(e);
  } finally {
    dataLoading.value = false;
  }
}

async function loadChannelList() {
  try {
    const res = await getNotifyChannelList({ pageIndex: 1, pageSize: 100 });
    if (res.code === 0) {
      channelList.value = res.data.list || [];
    }
  } catch (e) {
    console.error(e);
  }
}

async function loadSubscriptionList() {
  try {
    const res = await getNotifySubscriptionList({ pageIndex: 1, pageSize: 100000 });
    if (res.code === 0) {
      subscriptionList.value = res.data.list || [];
    }
  } catch (e) {
    console.error(e);
  }
}

function getChannelsByType(type: string) {
  return channelList.value.filter((c) => c.type === type);
}

function getSubscription(messageType: string, channelId: string) {
  return subscriptionList.value.find((sub) => sub.message_type === messageType && sub.channel_id === channelId);
}

function getChannelName(channelId: string) {
  const channel = channelList.value.find((c) => c.id === channelId);
  return channel ? channel.name : '';
}

function getMessageTypeName(type: string) {
  const msgType = messageTypes.value.find((m) => m.type === type);
  return msgType ? msgType.name : type;
}

// 获取渠道类型名称
function getChannelTypeName(channelType: string) {
  const found = channelTypes.find((item) => item.type === channelType);
  return found ? found.name : channelType;
}

// ===== 精细化配置（issue #822）=====

function parseJSON(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

// 把生效配置压成一行灰字。只列非默认项——全默认时不显示任何东西，避免噪音
function configSummary(sub: Record<string, any> | null) {
  if (!sub) return '';
  const parts: string[] = [];
  const throttle = parseJSON(sub.throttle_json) || {};

  const modeMap: Record<string, string> = {
    realtime: t('page.notify_subscription.throttle_mode_realtime'),
    aggregate: t('page.notify_subscription.throttle_mode_aggregate'),
    cooldown: t('page.notify_subscription.throttle_mode_cooldown'),
  };
  if (sub.throttle_mode && sub.throttle_mode !== 'inherit' && modeMap[sub.throttle_mode]) {
    let modeText = modeMap[sub.throttle_mode];
    if (sub.throttle_mode === 'aggregate' && throttle.aggregate_window_sec > 0) {
      modeText += `${throttle.aggregate_window_sec}s`;
    }
    parts.push(modeText);
  }
  if (throttle.max_per_hour > 0) {
    parts.push(t('page.notify_subscription.summary_limit', { count: throttle.max_per_hour }));
  }
  if (throttle.quiet_hours) {
    parts.push(t('page.notify_subscription.summary_quiet'));
  }
  if (sub.title_template || sub.content_template) {
    parts.push(t('page.notify_subscription.summary_custom_template'));
  }
  if (sub.filter_json) {
    parts.push(t('page.notify_subscription.summary_filtered'));
  }
  return parts.join(' · ');
}

// 打开单个格子的配置抽屉
function handleOpenConfig(messageType: string, channel: Record<string, any>) {
  const subscription = getSubscription(messageType, channel.id);
  if (!subscription) {
    MessagePlugin.warning('订阅不存在');
    return;
  }
  configSubscription.value = subscription;
  configChannelName.value = channel.name;
  configChannelType.value = channel.type;
  configMessageTypeName.value = getMessageTypeName(messageType);
  configDrawerVisible.value = true;
}

// 按渠道类型批量套用频控配置
function handleBatchConfig(channelType: string) {
  batchConfigChannelType.value = channelType;
  batchConfigChannelName.value = getChannelTypeName(channelType);
  batchConfigVisible.value = true;
}

async function onConfirmDelete() {
  if (formEditData.value && formEditData.value.id) {
    await deleteSubscription(formEditData.value.id);
    confirmVisible.value = false;
  }
}

function onCancel() {
  confirmVisible.value = false;
}

function handleAddSubscription(messageType: string, channel: Record<string, any>) {
  // 如果渠道被禁用，不允许添加
  if (channel.status === 0) {
    MessagePlugin.warning('该渠道已被禁用，无法添加订阅');
    return;
  }

  // 邮箱渠道需要配置收件人
  if (channel.type === 'email') {
    emailFormData.value = {
      subscription_id: '', // 新增订阅，ID为空
      message_type: messageType,
      channel_id: channel.id,
      recipients: '',
      status: 1,
    };
    emailDialogVisible.value = true;
  } else {
    // 其他渠道直接添加
    addSubscription(messageType, channel.id, '');
  }
}

function handleEditRecipients(messageType: string, channel: Record<string, any>) {
  const subscription = getSubscription(messageType, channel.id);
  emailFormData.value = {
    subscription_id: subscription?.id || '',
    message_type: messageType,
    channel_id: channel.id,
    recipients: subscription?.recipients || '',
    status: 1,
  };
  emailDialogVisible.value = true;
}

async function handleChannelToggle(messageType: string, channel: Record<string, any>, enabled: boolean) {
  const subscription = getSubscription(messageType, channel.id);

  if (!subscription) {
    // 不应该发生这种情况，因为没有订阅时显示的是+号
    MessagePlugin.warning('订阅不存在');
    return;
  }

  // 切换启用/禁用状态
  subscription.status = enabled ? 1 : 0;
  try {
    const res = await editNotifySubscription(subscription);
    if (res.code === 0) {
      MessagePlugin.success(enabled ? '已启用订阅' : '已禁用订阅');
      await loadSubscriptionList();
    } else {
      MessagePlugin.error(res.msg || '操作失败');
      await loadSubscriptionList();
    }
  } catch (error) {
    MessagePlugin.error('操作失败');
    await loadSubscriptionList();
  }
}

function handleDeleteSubscription(messageType: string, channelId: string) {
  const subscription = getSubscription(messageType, channelId);
  if (!subscription) return;

  formEditData.value = subscription;
  confirmBody.value = '确定要删除这个订阅吗？';
  confirmVisible.value = true;
}

async function addSubscription(messageType: string, channelId: string, recipients: string, silent = false) {
  try {
    const data = {
      message_type: messageType,
      channel_id: channelId,
      recipients,
      status: 1,
      filter_json: '',
      remarks: '',
    };

    const res = await addNotifySubscription(data);
    if (res.code === 0) {
      if (!silent) {
        MessagePlugin.success(t('page.notify_subscription.add_success'));
      }
      await loadSubscriptionList();
      return true;
    }
    if (!silent) {
      MessagePlugin.error(res.msg || t('page.notify_subscription.add_failed'));
    }
    await loadSubscriptionList();
    return false;
  } catch (error) {
    console.error(error);
    if (!silent) {
      MessagePlugin.error(t('page.notify_subscription.add_failed'));
    }
    await loadSubscriptionList();
    return false;
  }
}

async function updateSubscription(subscriptionId: string, recipients: string) {
  try {
    // 获取完整的订阅信息
    const subscription = subscriptionList.value.find((s) => s.id === subscriptionId);
    if (!subscription) {
      MessagePlugin.error('订阅信息不存在');
      return;
    }

    const data = {
      id: subscriptionId,
      message_type: subscription.message_type,
      channel_id: subscription.channel_id,
      recipients,
      status: subscription.status,
      filter_json: subscription.filter_json || '',
      remarks: subscription.remarks || '',
    };

    const res = await editNotifySubscription(data);
    if (res.code === 0) {
      MessagePlugin.success('修改收件人成功');
      await loadSubscriptionList();
    } else {
      MessagePlugin.error(res.msg || '修改收件人失败');
      await loadSubscriptionList();
    }
  } catch (error) {
    console.error(error);
    MessagePlugin.error('修改收件人失败');
    await loadSubscriptionList();
  }
}

async function deleteSubscription(subscriptionId: string, silent = false) {
  try {
    const res = await deleteNotifySubscription({ id: subscriptionId });
    if (res.code === 0) {
      if (!silent) {
        MessagePlugin.success(t('page.notify_subscription.delete_success'));
      }
      await loadSubscriptionList();
      return true;
    }
    if (!silent) {
      MessagePlugin.error(res.msg || t('page.notify_subscription.delete_failed'));
    }
    await loadSubscriptionList();
    return false;
  } catch (error) {
    console.error(error);
    if (!silent) {
      MessagePlugin.error(t('page.notify_subscription.delete_failed'));
    }
    await loadSubscriptionList();
    return false;
  }
}

const onEmailSubmit: FormProps['onSubmit'] = async ({ validateResult, firstError }) => {
  if (validateResult === true) {
    // 判断是新增还是编辑
    if (emailFormData.value.subscription_id) {
      await updateSubscription(emailFormData.value.subscription_id, emailFormData.value.recipients);
    } else {
      await addSubscription(emailFormData.value.message_type, emailFormData.value.channel_id, emailFormData.value.recipients);
    }
    emailDialogVisible.value = false;
  } else if (firstError) {
    MessagePlugin.warning(firstError);
  }
};

function onEmailDialogClose() {
  emailDialogVisible.value = false;
  loadSubscriptionList();
}

// 批量增加订阅
async function handleBatchAdd(channelType: string) {
  const channelsOfType = getChannelsByType(channelType);
  if (channelsOfType.length === 0) {
    MessagePlugin.warning(`当前没有可用的${getChannelTypeName(channelType)}渠道`);
    return;
  }

  let successCount = 0;
  let failCount = 0;

  // 为所有消息类型和该类型的所有渠道添加订阅
  for (const messageType of messageTypes.value) {
    for (const channel of channelsOfType) {
      const subscription = getSubscription(messageType.type, channel.id);
      if (!subscription && channel.status === 1) {
        const result = await addSubscription(messageType.type, channel.id, '', true); // silent模式
        if (result) {
          successCount++;
        } else {
          failCount++;
        }
      }
    }
  }

  // 显示汇总结果
  if (successCount > 0 || failCount > 0) {
    const channelName = getChannelTypeName(channelType);
    if (failCount === 0) {
      MessagePlugin.success(t('page.notify_subscription.batch_add_success', { channel: channelName, count: successCount }));
    } else if (successCount === 0) {
      MessagePlugin.error(t('page.notify_subscription.batch_add_failed', { channel: channelName, count: failCount }));
    } else {
      MessagePlugin.warning(
        t('page.notify_subscription.batch_add_partial', { channel: channelName, success: successCount, fail: failCount }),
      );
    }
  } else {
    MessagePlugin.info(t('page.notify_subscription.batch_add_already_exist', { channel: getChannelTypeName(channelType) }));
  }
}

// 批量删除订阅
async function handleBatchDelete(channelType: string) {
  const channelsOfType = getChannelsByType(channelType);
  if (channelsOfType.length === 0) {
    MessagePlugin.warning(`当前没有${getChannelTypeName(channelType)}渠道的订阅`);
    return;
  }

  const subscriptionsToDelete: string[] = [];
  for (const channel of channelsOfType) {
    for (const subscription of subscriptionList.value) {
      if (subscription.channel_id === channel.id) {
        subscriptionsToDelete.push(subscription.id);
      }
    }
  }

  if (subscriptionsToDelete.length === 0) {
    MessagePlugin.warning(`当前没有${getChannelTypeName(channelType)}渠道的订阅`);
    return;
  }

  // 显示确认对话框
  batchConfirmType.value = 'delete';
  batchConfirmChannelType.value = channelType;
  batchConfirmChannelName.value = getChannelTypeName(channelType);
  batchConfirmVisible.value = true;
}

// 批量开启订阅
async function handleBatchEnable(channelType: string) {
  const channelsOfType = getChannelsByType(channelType);
  if (channelsOfType.length === 0) {
    MessagePlugin.warning(`当前没有${getChannelTypeName(channelType)}渠道的订阅`);
    return;
  }

  // 先检查该渠道类型是否有订阅
  let totalCount = 0;
  let updatedCount = 0;
  for (const channel of channelsOfType) {
    for (const subscription of subscriptionList.value) {
      if (subscription.channel_id === channel.id) {
        totalCount++;
        if (subscription.status === 0) {
          await toggleSubscriptionStatus(subscription.id, 1);
          updatedCount++;
        }
      }
    }
  }

  const channelName = getChannelTypeName(channelType);
  if (totalCount === 0) {
    MessagePlugin.info(t('page.notify_subscription.batch_enable_no_subscription', { channel: channelName }));
  } else if (updatedCount === 0) {
    MessagePlugin.info(t('page.notify_subscription.batch_enable_all_enabled', { channel: channelName, count: totalCount }));
  } else {
    MessagePlugin.success(t('page.notify_subscription.batch_enable_success', { channel: channelName, count: updatedCount }));
  }
}

// 批量禁用订阅
async function handleBatchDisable(channelType: string) {
  const channelsOfType = getChannelsByType(channelType);
  if (channelsOfType.length === 0) {
    MessagePlugin.warning(`当前没有${getChannelTypeName(channelType)}渠道的订阅`);
    return;
  }

  // 先检查该渠道类型是否有订阅以及需要禁用的订阅数量
  let totalCount = 0;
  let toDisableCount = 0;
  const channelName = getChannelTypeName(channelType);

  for (const channel of channelsOfType) {
    for (const subscription of subscriptionList.value) {
      if (subscription.channel_id === channel.id) {
        totalCount++;
        if (subscription.status === 1) {
          toDisableCount++;
        }
      }
    }
  }

  if (totalCount === 0) {
    MessagePlugin.info(t('page.notify_subscription.batch_disable_no_subscription', { channel: channelName }));
    return;
  }

  if (toDisableCount === 0) {
    MessagePlugin.info(t('page.notify_subscription.batch_disable_all_disabled', { channel: channelName, count: totalCount }));
    return;
  }

  // 显示确认对话框
  batchConfirmType.value = 'disable';
  batchConfirmChannelType.value = channelType;
  batchConfirmChannelName.value = channelName;
  batchConfirmVisible.value = true;
}

// 切换订阅状态
async function toggleSubscriptionStatus(subscriptionId: string, status: number) {
  const subscription = subscriptionList.value.find((s) => s.id === subscriptionId);
  if (!subscription) {
    return;
  }

  const data = {
    id: subscriptionId,
    message_type: subscription.message_type,
    channel_id: subscription.channel_id,
    recipients: subscription.recipients || '',
    status,
    filter_json: subscription.filter_json || '',
    remarks: subscription.remarks || '',
  };

  await editNotifySubscription(data);
  await loadSubscriptionList();
}

// 批量操作确认处理
async function onBatchConfirm() {
  batchConfirmVisible.value = false;

  if (batchConfirmType.value === 'delete') {
    await executeBatchDelete();
  } else if (batchConfirmType.value === 'disable') {
    await executeBatchDisable();
  }
}

// 执行批量删除
async function executeBatchDelete() {
  const channelsOfType = getChannelsByType(batchConfirmChannelType.value);
  const subscriptionsToDelete: string[] = [];

  for (const channel of channelsOfType) {
    for (const subscription of subscriptionList.value) {
      if (subscription.channel_id === channel.id) {
        subscriptionsToDelete.push(subscription.id);
      }
    }
  }

  let successCount = 0;
  let failCount = 0;

  for (const id of subscriptionsToDelete) {
    const result = await deleteSubscription(id, true);
    if (result) {
      successCount++;
    } else {
      failCount++;
    }
  }

  const channelName = batchConfirmChannelName.value;
  if (failCount === 0) {
    MessagePlugin.success(t('page.notify_subscription.batch_delete_success', { channel: channelName, count: successCount }));
  } else if (successCount === 0) {
    MessagePlugin.error(t('page.notify_subscription.batch_delete_failed', { channel: channelName, count: failCount }));
  } else {
    MessagePlugin.warning(
      t('page.notify_subscription.batch_delete_partial', { channel: channelName, success: successCount, fail: failCount }),
    );
  }
}

// 执行批量禁用
async function executeBatchDisable() {
  const channelsOfType = getChannelsByType(batchConfirmChannelType.value);
  let updatedCount = 0;

  for (const channel of channelsOfType) {
    for (const subscription of subscriptionList.value) {
      if (subscription.channel_id === channel.id && subscription.status === 1) {
        await toggleSubscriptionStatus(subscription.id, 0);
        updatedCount++;
      }
    }
  }

  if (updatedCount > 0) {
    MessagePlugin.success(
      t('page.notify_subscription.batch_disable_success', { channel: batchConfirmChannelName.value, count: updatedCount }),
    );
  }
}
</script>

<style scoped>
.list-card-container {
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.page-header .page-header-main {
  flex: 1;
}

.page-header h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
}

.page-header .page-desc {
  margin: 0;
  color: #666;
  font-size: 14px;
}

/* 消息类型单元格 */
.message-type-cell .message-type-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

/* 渠道表头包装器 */
.channel-header-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

/* 渠道单元格 */
.channel-cell-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.channel-item-inline {
  display: flex;
  align-items: center;
}

.channel-item-inline .add-btn-inline {
  width: 100%;
}

.subscription-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.subscription-inline .channel-info-inline {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.channel-info-inline .channel-name {
  font-size: 13px;
  color: #333;
  font-weight: 500;
}

.channel-info-inline .channel-detail {
  font-size: 12px;
  color: #0052d9;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.channel-info-inline .edit-link-inline {
  font-size: 12px;
  color: #0052d9;
  cursor: pointer;
  text-decoration: none;
}

.channel-info-inline .edit-link-inline:hover {
  text-decoration: underline;
}

.channel-info-inline .config-summary {
  font-size: 12px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.subscription-inline .config-icon-inline {
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.subscription-inline .config-icon-inline:hover {
  color: #0052d9;
  transform: scale(1.15);
}

.subscription-inline .delete-icon-inline {
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.subscription-inline .delete-icon-inline:hover {
  color: #e34d59;
  transform: scale(1.15);
}
</style>
