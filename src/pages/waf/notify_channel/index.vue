<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAdd">{{ t('page.notify_channel.button_add') }}</t-button>
        </div>
        <div class="right-operation-container">
          <t-form ref="searchForm" :data="searchformData" :label-width="80" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.notify_channel.label_name')" name="name">
              <t-input v-model="searchformData.name" class="search-input" clearable></t-input>
            </t-form-item>
            <t-form-item :label="t('page.notify_channel.label_type')" name="type">
              <t-select v-model="searchformData.type" clearable :style="{ width: '150px' }">
                <t-option value="dingtalk" :label="t('page.notify_channel.type_dingtalk')"></t-option>
                <t-option value="feishu" :label="t('page.notify_channel.type_feishu')"></t-option>
                <t-option value="email" :label="t('page.notify_channel.type_email')"></t-option>
                <t-option value="serverchan" :label="t('page.notify_channel.type_serverchan')"></t-option>
                <t-option value="webhook" :label="t('page.notify_channel.type_webhook')"></t-option>
              </t-select>
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" @click="getList">{{ t('common.search') }}</t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>
      <help-block :summary="t('page.notify_channel.alert_message')" doc="guide/NotifyChannel" />
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
          <template #type="{ row }">
            <t-tag v-if="row.type === 'dingtalk'" theme="primary">{{ t('page.notify_channel.type_dingtalk') }}</t-tag>
            <t-tag v-else-if="row.type === 'feishu'" theme="success">{{ t('page.notify_channel.type_feishu') }}</t-tag>
            <t-tag v-else-if="row.type === 'email'" theme="warning">{{ t('page.notify_channel.type_email') }}</t-tag>
            <t-tag v-else-if="row.type === 'serverchan'" theme="danger">{{ t('page.notify_channel.type_serverchan') }}</t-tag>
            <t-tag v-else-if="row.type === 'webhook'" theme="success">{{ t('page.notify_channel.type_webhook') }}</t-tag>
            <t-tag v-else theme="default">{{ row.type }}</t-tag>
          </template>
          <template #status="{ row }">
            <t-switch v-model="row.status" :custom-value="[1, 0]" @change="handleStatusChange(row)"></t-switch>
          </template>
          <template #op="slotProps">
            <a class="t-button-link" @click="handleTest(slotProps)">{{ t('page.notify_channel.button_test') }}</a>
            <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.edit') }}</a>
            <a class="t-button-link" @click="handleClickDelete(slotProps)">{{ t('common.delete') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <!-- 添加对话框 -->
    <t-dialog v-model:visible="addFormVisible" :header="t('common.new')" :width="680" :footer="false">
      <!-- autocomplete 必须显式关掉。
           浏览器看到「文本框 + 紧跟着的密码框」就认定这是登录表单，会把保存的
           **管理端 admin 账号密码**填进渠道名称与密钥；用户不留神点了确定，
           就把管理员口令当成机器人密钥存进了库。
           Chrome 只认 new-password（off 对密码框无效），所以两个都得给。 -->
      <t-form ref="addForm" :data="formData" :rules="rules" :label-width="120" autocomplete="off" @submit="onSubmit">
        <t-form-item :label="t('page.notify_channel.label_name')" name="name">
          <t-input
            v-model="formData.name"
            :style="{ width: '480px' }"
            :placeholder="t('page.notify_channel.name_placeholder')"
            autocomplete="off"
          ></t-input>
        </t-form-item>
        <t-form-item :label="t('page.notify_channel.label_type')" name="type">
          <t-select v-model="formData.type" :style="{ width: '480px' }" @change="handleTypeChange">
            <t-option value="dingtalk" :label="t('page.notify_channel.type_dingtalk')"></t-option>
            <t-option value="feishu" :label="t('page.notify_channel.type_feishu')"></t-option>
            <t-option value="email" :label="t('page.notify_channel.type_email')"></t-option>
            <t-option value="serverchan" :label="t('page.notify_channel.type_serverchan')"></t-option>
            <t-option value="webhook" :label="t('page.notify_channel.type_webhook')"></t-option>
          </t-select>
        </t-form-item>

        <!-- 通用 Webhook 配置 -->
        <webhook-config v-if="formData.type === 'webhook'" :form="formData" />

        <!-- 钉钉、飞书配置 -->
        <template v-if="formData.type === 'dingtalk' || formData.type === 'feishu'">
          <t-form-item :label="t('page.notify_channel.label_webhook_url')" name="webhook_url">
            <t-input
              v-model="formData.webhook_url"
              :style="{ width: '480px' }"
              :placeholder="t('page.notify_channel.webhook_placeholder')"
            ></t-input>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.label_secret')" name="secret">
            <t-input
              v-model="formData.secret"
              :style="{ width: '480px' }"
              type="password"
              autocomplete="new-password"
              :placeholder="t('page.notify_channel.secret_placeholder')"
            ></t-input>
          </t-form-item>
        </template>

        <!-- Server酱配置 -->
        <template v-if="formData.type === 'serverchan'">
          <t-alert theme="info" :message="t('page.notify_channel.serverchan_config_tip')" style="margin-bottom: 16px"></t-alert>

          <t-form-item :label="t('page.notify_channel.serverchan_sendkey')" name="access_token">
            <t-input
              v-model="formData.access_token"
              :style="{ width: '480px' }"
              :placeholder="t('page.notify_channel.serverchan_sendkey_placeholder')"
            ></t-input>
          </t-form-item>

          <t-alert theme="warning" style="margin-top: 12px">
            <div style="line-height: 1.8">
              <div style="font-weight: bold; margin-bottom: 8px">📝 如何获取SendKey：</div>
              <div style="font-size: 12px; color: #666">
                <div>
                  1. 访问
                  <a href="https://sct.ftqq.com/" target="_blank" style="color: #0052d9">Server酱官网</a> 并完成登录
                </div>
                <div>2. 在控制台页面复制您的SendKey</div>
                <div>3. 在"消息通道"页面配置接收通知的平台</div>
                <div style="margin-top: 8px; color: #e37318">💡 提示：支持标准格式(SCT开头)和sctp私有部署格式</div>
              </div>
            </div>
          </t-alert>
        </template>

        <!-- 邮件配置 -->
        <template v-if="formData.type === 'email'">
          <t-alert theme="info" :message="t('page.notify_channel.email_config_tip')" style="margin-bottom: 16px"></t-alert>

          <!-- 常见邮箱配置参考 -->
          <t-collapse :default-value="[]" style="margin-bottom: 16px">
            <t-collapse-panel :header="t('page.notify_channel.email_common_config')" value="common">
              <email-config-reference />
            </t-collapse-panel>
          </t-collapse>

          <t-form-item :label="t('page.notify_channel.email_smtp_host')" name="email_smtp_host">
            <t-input
              v-model="formData.email_smtp_host"
              :style="{ width: '480px' }"
              :placeholder="t('page.notify_channel.email_smtp_host_placeholder')"
            ></t-input>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_smtp_port')" name="email_smtp_port">
            <t-input
              v-model="formData.email_smtp_port"
              :style="{ width: '480px' }"
              :placeholder="t('page.notify_channel.email_smtp_port_placeholder')"
            ></t-input>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_username')" name="email_username">
            <t-input
              v-model="formData.email_username"
              :style="{ width: '480px' }"
              autocomplete="off"
              :placeholder="t('page.notify_channel.email_username_placeholder')"
            ></t-input>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_password')" name="email_password">
            <t-input
              v-model="formData.email_password"
              :style="{ width: '480px' }"
              type="password"
              autocomplete="new-password"
              :placeholder="t('page.notify_channel.email_password_placeholder')"
            ></t-input>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_from')" name="email_from">
            <t-input
              v-model="formData.email_from"
              :style="{ width: '480px' }"
              :placeholder="t('page.notify_channel.email_from_placeholder')"
            ></t-input>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_from_name')" name="email_from_name">
            <t-input
              v-model="formData.email_from_name"
              :style="{ width: '480px' }"
              :placeholder="t('page.notify_channel.email_from_name_placeholder')"
            ></t-input>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_to')" name="email_to">
            <t-input
              v-model="formData.email_to"
              :style="{ width: '480px' }"
              :placeholder="t('page.notify_channel.email_to_placeholder')"
            ></t-input>
            <div style="font-size: 12px; color: #666; margin-top: 4px">
              💡 <b>默认收件人</b>，订阅时可针对消息类型单独配置，未配置则使用此默认值
            </div>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_ssl_mode')" name="email_ssl_mode">
            <t-radio-group v-model="formData.email_ssl_mode">
              <t-radio value="none">{{ t('page.notify_channel.email_ssl_none') }}</t-radio>
              <t-radio value="ssl">{{ t('page.notify_channel.email_ssl_ssl') }}</t-radio>
              <t-radio value="starttls">{{ t('page.notify_channel.email_ssl_starttls') }}</t-radio>
            </t-radio-group>
          </t-form-item>
          <t-form-item
            v-if="formData.email_ssl_mode !== 'none'"
            :label="t('page.notify_channel.email_skip_verify')"
            name="email_skip_verify"
          >
            <div :style="{ width: '480px' }">
              <t-checkbox v-model="formData.email_skip_verify" class="skip-verify-checkbox">
                {{ t('page.notify_channel.email_skip_verify_label') }}
              </t-checkbox>
              <div style="font-size: 12px; color: #666; margin-top: 4px; line-height: 1.5">
                ⚠️ {{ t('page.notify_channel.email_skip_verify_tip') }}
              </div>
            </div>
          </t-form-item>
        </template>
        <t-form-item :label="t('page.notify_channel.label_status')" name="status">
          <t-radio-group v-model="formData.status">
            <t-radio :value="1">{{ t('common.on') }}</t-radio>
            <t-radio :value="0">{{ t('common.off') }}</t-radio>
          </t-radio-group>
        </t-form-item>
        <t-form-item :label="t('common.remarks')" name="remarks">
          <t-textarea v-model="formData.remarks" :style="{ width: '480px' }" :autosize="{ minRows: 3, maxRows: 3 }"></t-textarea>
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="onClickCloseBtn">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 编辑对话框 -->
    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="680" :footer="false">
      <!-- autocomplete 关闭原因见新增弹窗上方注释 -->
      <t-form ref="editForm" :data="formEditData" :rules="rules" :label-width="120" autocomplete="off" @submit="onSubmitEdit">
        <t-form-item :label="t('page.notify_channel.label_name')" name="name">
          <t-input v-model="formEditData.name" :style="{ width: '480px' }" autocomplete="off"></t-input>
        </t-form-item>
        <t-form-item :label="t('page.notify_channel.label_type')" name="type">
          <t-select v-model="formEditData.type" :style="{ width: '480px' }" @change="handleEditTypeChange">
            <t-option value="dingtalk" :label="t('page.notify_channel.type_dingtalk')"></t-option>
            <t-option value="feishu" :label="t('page.notify_channel.type_feishu')"></t-option>
            <t-option value="email" :label="t('page.notify_channel.type_email')"></t-option>
            <t-option value="serverchan" :label="t('page.notify_channel.type_serverchan')"></t-option>
            <t-option value="webhook" :label="t('page.notify_channel.type_webhook')"></t-option>
          </t-select>
        </t-form-item>

        <!-- 通用 Webhook 配置 -->
        <webhook-config v-if="formEditData.type === 'webhook'" :form="formEditData" />

        <!-- 钉钉、飞书配置 -->
        <template v-if="formEditData.type === 'dingtalk' || formEditData.type === 'feishu'">
          <t-form-item :label="t('page.notify_channel.label_webhook_url')" name="webhook_url">
            <t-input v-model="formEditData.webhook_url" :style="{ width: '480px' }"></t-input>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.label_secret')" name="secret">
            <t-input
              v-model="formEditData.secret"
              :style="{ width: '480px' }"
              type="password"
              autocomplete="new-password"
              :placeholder="
                formEditData.has_secret
                  ? t('page.notify_channel.secret_set_placeholder')
                  : t('page.notify_channel.secret_placeholder')
              "
            ></t-input>
            <div v-if="formEditData.has_secret" class="notify-secret-tip">
              {{ t('page.notify_channel.secret_keep_tip') }}
            </div>
          </t-form-item>
        </template>

        <!-- Server酱配置 -->
        <template v-if="formEditData.type === 'serverchan'">
          <t-alert theme="info" :message="t('page.notify_channel.serverchan_config_tip')" style="margin-bottom: 16px"></t-alert>

          <t-form-item :label="t('page.notify_channel.serverchan_sendkey')" name="access_token">
            <t-input
              v-model="formEditData.access_token"
              :style="{ width: '480px' }"
              type="password"
              autocomplete="new-password"
              :placeholder="
                formEditData.has_access_token
                  ? t('page.notify_channel.secret_set_placeholder')
                  : t('page.notify_channel.serverchan_sendkey_placeholder')
              "
            ></t-input>
            <div v-if="formEditData.has_access_token" class="notify-secret-tip">
              {{ t('page.notify_channel.secret_keep_tip') }}
            </div>
          </t-form-item>

          <t-alert theme="warning" style="margin-top: 12px">
            <div style="line-height: 1.8">
              <div style="font-weight: bold; margin-bottom: 8px">📝 如何获取SendKey：</div>
              <div style="font-size: 12px; color: #666">
                <div>
                  1. 访问
                  <a href="https://sct.ftqq.com/" target="_blank" style="color: #0052d9">Server酱官网</a> 并完成登录
                </div>
                <div>2. 在控制台页面复制您的SendKey</div>
                <div>3. 在"消息通道"页面配置接收通知的平台</div>
                <div style="margin-top: 8px; color: #e37318">💡 提示：支持标准格式(SCT开头)和sctp私有部署格式</div>
              </div>
            </div>
          </t-alert>
        </template>

        <!-- 邮件配置 -->
        <template v-if="formEditData.type === 'email'">
          <t-alert theme="info" :message="t('page.notify_channel.email_config_tip')" style="margin-bottom: 16px"></t-alert>

          <!-- 常见邮箱配置参考 -->
          <t-collapse :default-value="[]" style="margin-bottom: 16px">
            <t-collapse-panel :header="t('page.notify_channel.email_common_config')" value="common">
              <email-config-reference />
            </t-collapse-panel>
          </t-collapse>

          <t-form-item :label="t('page.notify_channel.email_smtp_host')" name="email_smtp_host">
            <t-input v-model="formEditData.email_smtp_host" :style="{ width: '480px' }"></t-input>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_smtp_port')" name="email_smtp_port">
            <t-input v-model="formEditData.email_smtp_port" :style="{ width: '480px' }"></t-input>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_username')" name="email_username">
            <t-input v-model="formEditData.email_username" :style="{ width: '480px' }" autocomplete="off"></t-input>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_password')" name="email_password">
            <t-input v-model="formEditData.email_password" :style="{ width: '480px' }" type="password" autocomplete="new-password"></t-input>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_from')" name="email_from">
            <t-input v-model="formEditData.email_from" :style="{ width: '480px' }"></t-input>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_from_name')" name="email_from_name">
            <t-input v-model="formEditData.email_from_name" :style="{ width: '480px' }"></t-input>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_to')" name="email_to">
            <t-input v-model="formEditData.email_to" :style="{ width: '480px' }"></t-input>
            <div style="font-size: 12px; color: #666; margin-top: 4px">
              💡 <b>默认收件人</b>，订阅时可针对消息类型单独配置，未配置则使用此默认值
            </div>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_ssl_mode')" name="email_ssl_mode">
            <t-radio-group v-model="formEditData.email_ssl_mode">
              <t-radio value="none">{{ t('page.notify_channel.email_ssl_none') }}</t-radio>
              <t-radio value="ssl">{{ t('page.notify_channel.email_ssl_ssl') }}</t-radio>
              <t-radio value="starttls">{{ t('page.notify_channel.email_ssl_starttls') }}</t-radio>
            </t-radio-group>
          </t-form-item>
          <t-form-item
            v-if="formEditData.email_ssl_mode !== 'none'"
            :label="t('page.notify_channel.email_skip_verify')"
            name="email_skip_verify"
          >
            <div :style="{ width: '480px' }">
              <t-checkbox v-model="formEditData.email_skip_verify" class="skip-verify-checkbox">
                {{ t('page.notify_channel.email_skip_verify_label') }}
              </t-checkbox>
              <div style="font-size: 12px; color: #666; margin-top: 4px; line-height: 1.5">
                ⚠️ {{ t('page.notify_channel.email_skip_verify_tip') }}
              </div>
            </div>
          </t-form-item>
        </template>
        <t-form-item :label="t('page.notify_channel.label_status')" name="status">
          <t-radio-group v-model="formEditData.status">
            <t-radio :value="1">{{ t('common.on') }}</t-radio>
            <t-radio :value="0">{{ t('common.off') }}</t-radio>
          </t-radio-group>
        </t-form-item>
        <t-form-item :label="t('common.remarks')" name="remarks">
          <t-textarea v-model="formEditData.remarks" :style="{ width: '480px' }" :autosize="{ minRows: 3, maxRows: 3 }"></t-textarea>
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="onClickCloseEditBtn">{{ t('common.close') }}</t-button>
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
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import type { FormProps, PageInfo, TableProps } from 'tdesign-vue-next';

import {
  addNotifyChannel,
  deleteNotifyChannel,
  editNotifyChannel,
  getNotifyChannelList,
  testNotifyChannel,
} from '@/apis/notify_channel';

import WebhookConfig from './components/WebhookConfig.vue';
import { buildWebhookConfig } from './webhook_presets';

const { t } = useI18n();

// 常见邮箱配置参考块（添加/编辑弹窗共用）
const EmailConfigReference = defineComponent({
  name: 'EmailConfigReference',
  setup() {
    const box = (title: string, lines: string[]) =>
      h('div', { style: 'padding: 10px; background: #f5f5f5; border-radius: 4px;' }, [
        h('div', { style: 'color: #1976d2; font-weight: bold; margin-bottom: 4px;' }, title),
        h(
          'div',
          { style: 'font-size: 12px; color: #666;' },
          lines.map((line) => h('div', { innerHTML: line })),
        ),
      ]);
    return () =>
      h('div', { style: 'line-height: 1.8;' }, [
        h('div', { style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px;' }, [
          box('⭐ QQ邮箱 (推荐)', ['SMTP: <code>smtp.qq.com</code>', '端口: <code>465</code> | 加密: <strong>SSL/TLS</strong>', '密码: 授权码']),
          box('163邮箱', ['SMTP: <code>smtp.163.com</code>', '端口: <code>465</code> | 加密: <strong>SSL/TLS</strong>', '密码: 授权码']),
          box('126邮箱', ['SMTP: <code>smtp.126.com</code>', '端口: <code>465</code> | 加密: <strong>SSL/TLS</strong>', '密码: 授权码']),
          box('⭐ Gmail', ['SMTP: <code>smtp.gmail.com</code>', '端口: <code>587</code> | 加密: <strong>STARTTLS</strong>', '密码: 应用专用密码']),
          box('Outlook/Hotmail', ['SMTP: <code>smtp.office365.com</code>', '端口: <code>587</code> | 加密: <strong>STARTTLS</strong>']),
          box('阿里云邮箱', ['SMTP: <code>smtp.aliyun.com</code>', '端口: <code>465</code> | 加密: <strong>SSL/TLS</strong>']),
        ]),
        h(
          'div',
          { style: 'margin-top: 16px; padding: 10px; background: #fff3e0; border-left: 3px solid #ff9800; border-radius: 4px;' },
          [
            h('div', { style: 'color: #e65100; font-weight: bold; margin-bottom: 8px;' }, '⚠️ 重要提示：'),
            h('div', { style: 'color: #666; font-size: 12px; line-height: 1.8;' }, [
              h('div', {
                innerHTML: '• 大多数邮箱需要先开启SMTP服务并生成<strong style="color: #d32f2f;">授权码</strong>（不是登录密码）',
              }),
              h('div', {
                innerHTML: '• <strong>QQ/163邮箱</strong>：网页版邮箱 → 设置 → 账户 → POP3/SMTP/IMAP → 开启服务 → 生成授权码',
              }),
              h('div', {
                innerHTML: '• <strong>Gmail</strong>：Google账户 → 安全性 → 两步验证（必须开启）→ 应用专用密码',
              }),
              h('div', {
                style: 'margin-top: 6px; color: #2196f3;',
                innerHTML: '💡 推荐配置：<strong>端口465+SSL/TLS</strong> 或 <strong>端口587+STARTTLS</strong>',
              }),
            ]),
          ],
        ),
      ]);
  },
});

const INITIAL_DATA = {
  name: '',
  type: 'dingtalk',
  webhook_url: '',
  secret: '',
  access_token: '',
  // 后端脱敏后回传的"是否已配置"标记（列表已带），用于编辑时提示与占位符
  has_secret: false,
  has_access_token: false,
  config_json: '',
  status: 1,
  remarks: '',
  // 邮件配置字段
  email_smtp_host: '',
  email_smtp_port: '25',
  email_username: '',
  email_password: '',
  email_from: '',
  email_from_name: '',
  email_to: '',
  email_ssl_mode: 'none',
  email_skip_verify: false,
  // 通用Webhook配置字段
  webhook_preset: 'custom',
  webhook_method: 'POST',
  webhook_content_type: 'application/json',
  webhook_headers: [] as Array<{ key: string; value: string }>,
  webhook_body_template: '',
};

// 每次都要新建一份：webhook_headers 是数组，浅拷贝会让新增和编辑两个表单共用同一个数组
const newFormData = () => ({ ...INITIAL_DATA, webhook_headers: [] as Array<{ key: string; value: string }> });

const data = ref<Record<string, any>[]>([]);
const dataLoading = ref(false);
const rowKey = 'id';

const columns = computed<TableProps['columns']>(() => [
  { colKey: 'row-select', type: 'multiple', width: 50, fixed: 'left' },
  { title: t('page.notify_channel.label_name'), colKey: 'name', width: 150 },
  { title: t('page.notify_channel.label_type'), colKey: 'type', width: 120 },
  { title: t('page.notify_channel.label_webhook_url'), colKey: 'webhook_url', ellipsis: true },
  { title: t('page.notify_channel.label_status'), colKey: 'status', width: 100 },
  { title: t('common.remarks'), colKey: 'remarks', ellipsis: true, width: 200 },
  { title: t('common.create_time'), colKey: 'create_time', width: 180 },
  { align: 'left', fixed: 'right', width: 200, colKey: 'op', title: t('common.op') },
]);

const pagination = reactive({
  pageSize: 20,
  total: 0,
  current: 1,
});

const searchformData = reactive({
  pageIndex: 1,
  pageSize: 20,
  name: '',
  type: '',
});

const formData = ref<Record<string, any>>(newFormData());
const formEditData = ref<Record<string, any>>(newFormData());

const rules: FormProps['rules'] = {
  name: [{ required: true, message: t('common.required'), type: 'error' }],
  type: [{ required: true, message: t('common.required'), type: 'error' }],
  webhook_url: [{ required: true, message: t('common.required'), type: 'error' }],
};

const addFormVisible = ref(false);
const editFormVisible = ref(false);
const confirmVisible = ref(false);
const confirmBody = ref('');

onMounted(() => {
  getList();
});

async function getList() {
  dataLoading.value = true;
  try {
    const res = await getNotifyChannelList(searchformData);
    if (res.code === 0) {
      data.value = res.data.list || [];
      pagination.total = res.data.total;
      pagination.current = searchformData.pageIndex;
      pagination.pageSize = searchformData.pageSize;
    }
  } catch (e) {
    console.error(e);
  } finally {
    dataLoading.value = false;
  }
}

function rehandlePageChange(pageInfo: PageInfo) {
  searchformData.pageIndex = pageInfo.current;
  searchformData.pageSize = pageInfo.pageSize;
  getList();
}

function handleAdd() {
  formData.value = newFormData();
  addFormVisible.value = true;
}

function handleClickEdit(e: { row: Record<string, any> }) {
  const row: Record<string, any> = { ...newFormData(), ...e.row };
  // 如果是通用Webhook类型，解析config_json
  if (row.type === 'webhook' && row.config_json) {
    try {
      const config = JSON.parse(row.config_json);
      row.webhook_url = config.url || row.webhook_url || '';
      row.webhook_method = config.method || 'POST';
      row.webhook_content_type = config.content_type || 'application/json';
      row.webhook_headers = Array.isArray(config.headers)
        ? config.headers.map((h: any) => ({ key: h.key || '', value: h.value || '' }))
        : [];
      row.webhook_body_template = config.body_template || '';
      row.webhook_preset = 'custom';
    } catch (err) {
      console.error('解析Webhook配置失败', err);
    }
  }
  // 如果是邮件类型，解析config_json
  if (row.type === 'email' && row.config_json) {
    try {
      const config = JSON.parse(row.config_json);
      row.email_smtp_host = config.smtp_host || '';
      row.email_smtp_port = config.smtp_port || '25';
      row.email_username = config.username || '';
      row.email_password = config.password || '';
      row.email_from = config.from_email || '';
      row.email_from_name = config.from_name || '';
      row.email_to = (config.to_emails || []).join(',');
      // eslint-disable-next-line no-nested-ternary
      row.email_ssl_mode = config.enable_ssl ? 'ssl' : config.enable_starttls ? 'starttls' : 'none';
      row.email_skip_verify = config.skip_verify || false;
    } catch (err) {
      console.error('解析邮件配置失败', err);
    }
  }
  // 密钥字段后端已不回显（列表只带 has_secret / has_access_token），
  // 这里再显式清一次，确保输入框永远从空开始：留空提交=保持原值。
  row.secret = '';
  row.access_token = '';
  formEditData.value = row;
  editFormVisible.value = true;
}

function handleClickDelete(e: { row: Record<string, any> }) {
  formEditData.value = { ...e.row };
  confirmBody.value = t('page.notify_channel.delete_confirm');
  confirmVisible.value = true;
}

async function handleTest(e: { row: Record<string, any> }) {
  try {
    const res = await testNotifyChannel({ id: e.row.id });
    if (res.code === 0) {
      MessagePlugin.success(t('page.notify_channel.test_success'));
    } else {
      MessagePlugin.error(`${t('page.notify_channel.test_failed')}: ${res.msg}`);
    }
  } catch (error) {
    MessagePlugin.error(t('page.notify_channel.test_failed'));
  }
}

// 只改启用状态：整行回传即可。行里的 secret/access_token 是后端脱敏后的空串，
// 按"留空=保持原值"语义不会动到已存密钥（这里不能走 normalizeSecretsForEdit，
// 那是编辑表单换类型时才需要的显式清空）。
async function handleStatusChange(row: Record<string, any>) {
  try {
    const res = await editNotifyChannel(row);
    if (res.code === 0) {
      MessagePlugin.success(t('common.tips.save_success'));
    } else {
      row.status = row.status === 1 ? 0 : 1;
      MessagePlugin.error(t('common.tips.save_failed'));
    }
  } catch (error) {
    row.status = row.status === 1 ? 0 : 1;
    MessagePlugin.error(t('common.tips.save_failed'));
  }
}

// 与后端 waf_service.ConfigClearSentinel 约定：编辑时密钥字段留空=保持原值
// （后端不回显原文，空提交不能当成清空），要真正清空必须提交这个哨兵值。
const SECRET_CLEAR_SENTINEL = '__SAMWAF_CLEAR__';

// 各渠道类型真正会用到的密钥字段：
//   secret       —— 钉钉/飞书的签名密钥
//   access_token —— Server酱的 SendKey
const TYPES_USING_SECRET = ['dingtalk', 'feishu'];
const TYPES_USING_ACCESS_TOKEN = ['serverchan'];

// normalizeSecretsForEdit 仅用于【编辑】提交（就地修改 submitData）：
// 本类型使用的密钥字段留空即可（后端理解为"保持原值"）；用不到的字段发哨兵值真正清空，
// 否则换过渠道类型后旧密钥会一直滞留在库里。
// 新增走的是另一条路：那时没有"原值"，空串就是空串，不能发哨兵。
function normalizeSecretsForEdit(submitData: Record<string, any>) {
  if (!TYPES_USING_SECRET.includes(submitData.type)) {
    submitData.secret = SECRET_CLEAR_SENTINEL;
  }
  if (!TYPES_USING_ACCESS_TOKEN.includes(submitData.type)) {
    submitData.access_token = SECRET_CLEAR_SENTINEL;
  }
}

// 邮件/Server酱类型提交前整理 config_json 与互斥字段
function normalizeSubmitData(source: Record<string, any>) {
  const submitData = { ...source };
  if (submitData.type === 'email') {
    const emailConfig = {
      smtp_host: submitData.email_smtp_host,
      smtp_port: submitData.email_smtp_port,
      username: submitData.email_username,
      password: submitData.email_password,
      from_email: submitData.email_from,
      from_name: submitData.email_from_name,
      to_emails: (submitData.email_to || '').split(',').map((email: string) => email.trim()),
      enable_ssl: submitData.email_ssl_mode === 'ssl',
      enable_starttls: submitData.email_ssl_mode === 'starttls',
      skip_verify: submitData.email_ssl_mode !== 'none' && !!submitData.email_skip_verify,
    };
    submitData.config_json = JSON.stringify(emailConfig);
    submitData.webhook_url = '';
    submitData.secret = '';
  } else if (submitData.type === 'serverchan') {
    // Server酱使用access_token存储SendKey
    submitData.webhook_url = '';
    submitData.secret = '';
    submitData.config_json = '';
  } else if (submitData.type === 'webhook') {
    // 地址同时写进 webhook_url 列，列表页那一列才有内容可展示
    submitData.webhook_url = (submitData.webhook_url || '').trim();
    submitData.secret = '';
    submitData.access_token = '';
    submitData.config_json = buildWebhookConfig(submitData);
  }
  return submitData;
}

const onSubmit: FormProps['onSubmit'] = async ({ validateResult, firstError }) => {
  if (validateResult === true) {
    try {
      const res = await addNotifyChannel(normalizeSubmitData(formData.value));
      if (res.code === 0) {
        MessagePlugin.success(t('page.notify_channel.add_success'));
        addFormVisible.value = false;
        getList();
      } else {
        MessagePlugin.error(res.msg || t('page.notify_channel.add_failed'));
      }
    } catch (error) {
      MessagePlugin.error(t('page.notify_channel.add_failed'));
    }
  } else {
    MessagePlugin.warning(firstError || '');
  }
};

const onSubmitEdit: FormProps['onSubmit'] = async ({ validateResult, firstError }) => {
  if (validateResult === true) {
    try {
      const submitData = normalizeSubmitData(formEditData.value);
      // 编辑专用：本类型用不到的密钥必须显式清空（空串在后端表示保持原值）
      normalizeSecretsForEdit(submitData);
      const res = await editNotifyChannel(submitData);
      if (res.code === 0) {
        MessagePlugin.success(t('page.notify_channel.edit_success'));
        editFormVisible.value = false;
        getList();
      } else {
        MessagePlugin.error(res.msg || t('page.notify_channel.edit_failed'));
      }
    } catch (error) {
      MessagePlugin.error(t('page.notify_channel.edit_failed'));
    }
  } else {
    MessagePlugin.warning(firstError || '');
  }
};

async function onConfirmDelete() {
  try {
    const res = await deleteNotifyChannel({ id: formEditData.value.id });
    if (res.code === 0) {
      MessagePlugin.success(t('page.notify_channel.delete_success'));
      confirmVisible.value = false;
      getList();
    } else {
      MessagePlugin.error(res.msg || t('page.notify_channel.delete_failed'));
    }
  } catch (error) {
    MessagePlugin.error(t('page.notify_channel.delete_failed'));
  }
}

function onCancel() {
  confirmVisible.value = false;
}

function onClickCloseBtn() {
  addFormVisible.value = false;
}

function onClickCloseEditBtn() {
  editFormVisible.value = false;
}

// 切换类型时清空相关字段
function resetTypeFields(target: Record<string, any>, value: string) {
  if (value === 'email') {
    target.webhook_url = '';
    target.secret = '';
    target.access_token = '';
  } else if (value === 'serverchan') {
    target.webhook_url = '';
    target.secret = '';
    target.email_smtp_host = '';
    target.email_smtp_port = '25';
    target.email_username = '';
    target.email_password = '';
    target.email_from = '';
    target.email_from_name = '';
    target.email_to = '';
    target.email_ssl_mode = 'none';
    target.email_skip_verify = false;
  } else {
    target.access_token = '';
    target.email_smtp_host = '';
    target.email_smtp_port = '25';
    target.email_username = '';
    target.email_password = '';
    target.email_from = '';
    target.email_from_name = '';
    target.email_to = '';
    target.email_ssl_mode = 'none';
    target.email_skip_verify = false;
  }
}

function handleTypeChange(value: any) {
  resetTypeFields(formData.value, value as string);
}

function handleEditTypeChange(value: any) {
  resetTypeFields(formEditData.value, value as string);
}
</script>

<style scoped>
.list-card-container {
  padding: 16px;
}

.table-container {
  margin-top: 16px;
}

.search-input {
  width: 200px;
}

.left-operation-container .t-button {
  margin-right: 8px;
}

/* 防止复选框方块在标签换行时被压扁 */
.skip-verify-checkbox {
  align-items: flex-start;
}

.skip-verify-checkbox :deep(.t-checkbox__input) {
  flex-shrink: 0;
  margin-top: 2px;
}

.skip-verify-checkbox :deep(.t-checkbox__label) {
  line-height: 1.4;
}
</style>

<style>
/* 弹窗内容由 TDesign 挂到 body 下，scoped 样式命中不到，这里用全局作用域 */
.notify-secret-tip {
  margin-top: 4px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  line-height: 1.5;
}
</style>
