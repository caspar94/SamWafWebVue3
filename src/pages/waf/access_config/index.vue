<template>
  <div>
    <t-card class="list-card-container">
      <!-- 总开关就地可改：它决定整个功能开不开，让用户为了它跑一趟【系统配置】既绕又容易找不到 -->
      <div class="master-bar" :class="{ 'is-on': masterEnabled }">
        <div class="master-left">
          <t-switch v-model="masterEnabled" :loading="masterLoading" @change="onMasterChange" />
          <span class="master-title">{{ t('page.access.config.master_switch') }}</span>
          <t-tag v-if="masterEnabled" theme="success" variant="light">{{ t('page.access.config.master_on') }}</t-tag>
          <t-tag v-else theme="default" variant="light">{{ t('page.access.config.master_off') }}</t-tag>
        </div>
        <div class="master-tips">{{ t('page.access.config.master_switch_tips') }}</div>
        <t-button variant="outline" size="small" @click="gotoAccount">
          {{ t('page.access.config.goto_account') }}
        </t-button>
      </div>

      <t-form :data="formData" :label-width="180" :style="{ marginTop: '8px' }" @submit="onSubmit">
        <t-tabs v-model="activeTab">
          <!-- ① 基础设置：不配这几项功能就跑不起来 / 一定会踩坑，其余全部收进高级设置 -->
          <t-tab-panel value="basic" :label="t('page.access.config.tab_basic')">
            <div class="tab-body">
              <t-form-item :label="t('page.access.config.label_center_origin')" name="center_origin" required-mark>
                <t-select
                  v-model="formData.center_origin"
                  :style="{ width: '520px' }"
                  filterable
                  creatable
                  clearable
                  :placeholder="t('page.access.config.center_origin_placeholder')"
                  @create="onCreateCenterOrigin"
                >
                  <t-option v-for="h in centerHostOptions" :key="h.origin" :value="h.origin" :label="h.label" />
                </t-select>
                <div class="form-tips">{{ t('page.access.config.center_origin_tips') }}</div>
                <t-alert
                  v-if="centerHostOptions.length === 0"
                  theme="warning"
                  :style="{ width: '520px', marginTop: '8px' }"
                  :message="t('page.access.config.center_origin_empty')"
                />
              </t-form-item>

              <t-form-item :label="t('page.access.config.label_session_ttl')" name="session_ttl_minutes">
                <t-input-number v-model="formData.session_ttl_minutes" :style="{ width: '220px' }" :min="1" theme="column" />
                <span class="unit">{{ t('page.access.unit_minute') }}</span>
                <div class="form-tips">{{ t('page.access.config.session_ttl_tips') }}</div>
              </t-form-item>

              <t-form-item :label="t('page.access.config.label_require_otp')" name="require_otp">
                <t-radio-group v-model="formData.require_otp">
                  <t-radio :value="0">{{ t('page.access.disable') }}</t-radio>
                  <t-radio :value="1">{{ t('page.access.enable') }}</t-radio>
                </t-radio-group>
                <div class="form-tips">{{ t('page.access.config.require_otp_tips') }}</div>
              </t-form-item>

              <t-form-item :label="t('page.access.config.label_max_fail')" name="max_fail_count">
                <t-input-number v-model="formData.max_fail_count" :style="{ width: '160px' }" :min="1" theme="column" />
                <span class="unit">{{ t('page.access.unit_times') }}</span>
                <span class="unit">{{ t('page.access.config.lock_join') }}</span>
                <t-input-number v-model="formData.lock_minutes" :style="{ width: '160px' }" :min="1" theme="column" />
                <span class="unit">{{ t('page.access.unit_minute') }}</span>
                <div class="form-tips">{{ t('page.access.config.max_fail_tips') }}</div>
              </t-form-item>

              <t-form-item :label="t('page.access.config.label_exclude_paths')" name="global_exclude_paths">
                <t-textarea
                  v-model="formData.global_exclude_paths"
                  :style="{ width: '520px' }"
                  :autosize="{ minRows: 3, maxRows: 8 }"
                  :placeholder="excludePathsPlaceholder"
                />
                <div class="form-tips">{{ t('page.access.config.exclude_paths_tips') }}</div>
              </t-form-item>

              <t-form-item :label="t('page.access.config.label_bypass_ip_group')" name="bypass_ip_group_code">
                <t-select
                  v-model="formData.bypass_ip_group_code"
                  :style="{ width: '520px' }"
                  clearable
                  :placeholder="t('common.select_placeholder')"
                >
                  <t-option v-for="g in ipGroups" :key="g.group_code" :value="g.group_code" :label="g.group_name" />
                </t-select>
                <div class="form-tips">{{ t('page.access.config.bypass_ip_group_tips') }}</div>
              </t-form-item>
            </div>
          </t-tab-panel>

          <!-- ② 高级设置：默认值对绝大多数人都是对的，改错了容易把自己挡在外面 -->
          <t-tab-panel value="advanced" :label="t('page.access.config.tab_advanced')">
            <div class="tab-body">
              <t-divider align="left">{{ t('page.access.config.section_path') }}</t-divider>

              <t-form-item :label="t('page.access.config.label_path_prefix')" name="path_prefix">
                <t-input v-model="formData.path_prefix" :style="{ width: '520px' }" placeholder="/samwaf_access" />
                <div class="form-tips">{{ t('page.access.config.path_prefix_tips') }}</div>
              </t-form-item>
              <t-form-item :label="t('page.access.config.label_cookie_prefix')" name="cookie_prefix">
                <t-input v-model="formData.cookie_prefix" :style="{ width: '520px' }" placeholder="samwaf_ac" />
                <div class="form-tips">{{ t('page.access.config.cookie_prefix_tips') }}</div>
              </t-form-item>
              <t-form-item :label="t('page.access.config.label_force_secure')" name="force_secure_cookie">
                <t-radio-group v-model="formData.force_secure_cookie">
                  <t-radio :value="0">{{ t('page.access.config.secure_auto') }}</t-radio>
                  <t-radio :value="1">{{ t('page.access.config.secure_force') }}</t-radio>
                </t-radio-group>
                <div class="form-tips">{{ t('page.access.config.force_secure_tips') }}</div>
              </t-form-item>
              <t-form-item :label="t('page.access.config.label_hmac_secret')">
                <t-tag v-if="hasHmacSecret" theme="success" variant="light">{{ t('page.access.config.secret_set') }}</t-tag>
                <t-tag v-else theme="warning" variant="light">{{ t('page.access.config.secret_unset') }}</t-tag>
                <t-button variant="outline" size="small" :style="{ marginLeft: '12px' }" @click="regenerateVisible = true">
                  {{ t('page.access.config.button_regenerate') }}
                </t-button>
                <div class="form-tips">{{ t('page.access.config.hmac_secret_tips') }}</div>
              </t-form-item>

              <t-divider align="left">{{ t('page.access.config.section_ttl') }}</t-divider>

              <t-form-item :label="t('page.access.config.label_token_ttl')" name="token_ttl_minutes">
                <t-input-number v-model="formData.token_ttl_minutes" :style="{ width: '220px' }" :min="1" theme="column" />
                <span class="unit">{{ t('page.access.unit_minute') }}</span>
                <div class="form-tips">{{ t('page.access.config.token_ttl_tips') }}</div>
              </t-form-item>
              <t-form-item :label="t('page.access.config.label_ticket_ttl')" name="ticket_ttl_seconds">
                <t-input-number v-model="formData.ticket_ttl_seconds" :style="{ width: '220px' }" :min="1" :max="300" theme="column" />
                <span class="unit">{{ t('page.access.unit_second') }}</span>
                <div class="form-tips">{{ t('page.access.config.ticket_ttl_tips') }}</div>
              </t-form-item>
              <t-form-item :label="t('page.access.config.label_idle_timeout')" name="idle_timeout_minutes">
                <t-input-number v-model="formData.idle_timeout_minutes" :style="{ width: '220px' }" :min="0" theme="column" />
                <span class="unit">{{ t('page.access.unit_minute') }}</span>
                <div class="form-tips">{{ t('page.access.config.idle_timeout_tips') }}</div>
              </t-form-item>
              <t-form-item :label="t('page.access.config.label_cache_ttl')" name="cache_positive_ttl_sec">
                <t-input-number v-model="formData.cache_positive_ttl_sec" :style="{ width: '220px' }" :min="1" :max="60" theme="column" />
                <span class="unit">{{ t('page.access.unit_second') }}</span>
                <div class="form-tips">{{ t('page.access.config.cache_ttl_tips') }}</div>
              </t-form-item>

              <t-divider align="left">{{ t('page.access.config.section_bind') }}</t-divider>

              <t-form-item :label="t('page.access.config.label_bind_ip')" name="bind_ip">
                <t-radio-group v-model="formData.bind_ip">
                  <t-radio :value="0">{{ t('page.access.disable') }}</t-radio>
                  <t-radio :value="1">{{ t('page.access.enable') }}</t-radio>
                </t-radio-group>
                <div class="form-tips">{{ t('page.access.config.bind_ip_tips') }}</div>
              </t-form-item>
              <t-form-item :label="t('page.access.config.label_bind_fingerprint')" name="bind_fingerprint">
                <t-radio-group v-model="formData.bind_fingerprint">
                  <t-radio :value="0">{{ t('page.access.disable') }}</t-radio>
                  <t-radio :value="1">{{ t('page.access.enable') }}</t-radio>
                </t-radio-group>
                <div class="form-tips">{{ t('page.access.config.bind_fingerprint_tips') }}</div>
              </t-form-item>

              <t-divider align="left">{{ t('page.access.config.section_bypass') }}</t-divider>

              <t-form-item :label="t('page.access.config.label_service_token_header')" name="service_token_header">
                <t-input v-model="formData.service_token_header" :style="{ width: '520px' }" placeholder="X-Service-Token" />
                <div class="form-tips">{{ t('page.access.config.service_token_header_tips') }}</div>
              </t-form-item>
              <t-form-item :label="t('page.access.config.label_service_tokens')" name="service_tokens">
                <t-textarea
                  v-model="formData.service_tokens"
                  :style="{ width: '520px' }"
                  :autosize="{ minRows: 2, maxRows: 6 }"
                  :placeholder="hasServiceToken ? t('page.access.config.service_tokens_set_placeholder') : ''"
                />
                <div class="form-tips">{{ t('page.access.config.service_tokens_tips') }}</div>
              </t-form-item>

              <t-divider align="left">{{ t('page.access.config.section_cors') }}</t-divider>

              <t-form-item :label="t('page.access.config.label_cors_allow_origins')" name="cors_allow_origins">
                <t-textarea
                  v-model="formData.cors_allow_origins"
                  :style="{ width: '520px' }"
                  :autosize="{ minRows: 2, maxRows: 6 }"
                  placeholder="https://app.example.com&#10;https://admin.example.com:8443"
                />
                <div class="form-tips">{{ t('page.access.config.cors_allow_origins_tips') }}</div>
              </t-form-item>
              <t-form-item :label="t('page.access.config.label_cors_allow_methods')" name="cors_allow_methods">
                <t-input v-model="formData.cors_allow_methods" :style="{ width: '520px' }" placeholder="GET,POST,PUT,PATCH,DELETE,OPTIONS" />
                <div class="form-tips">{{ t('page.access.config.cors_allow_methods_tips') }}</div>
              </t-form-item>
              <t-form-item :label="t('page.access.config.label_cors_allow_headers')" name="cors_allow_headers">
                <t-input v-model="formData.cors_allow_headers" :style="{ width: '520px' }" placeholder="Content-Type,Authorization,X-Requested-With" />
                <div class="form-tips">{{ t('page.access.config.cors_allow_headers_tips') }}</div>
              </t-form-item>
              <t-form-item :label="t('page.access.config.label_cors_max_age')" name="cors_max_age">
                <t-input-number v-model="formData.cors_max_age" :style="{ width: '200px' }" :min="0" :max="7200" theme="column" />
                <div class="form-tips">{{ t('page.access.config.cors_max_age_tips') }}</div>
              </t-form-item>

              <t-divider align="left">{{ t('page.access.config.section_behavior') }}</t-divider>

              <t-form-item :label="t('page.access.config.label_unauth_action')" name="unauth_action">
                <t-radio-group v-model="formData.unauth_action">
                  <t-radio value="auto">{{ t('page.access.unauth_auto') }}</t-radio>
                  <t-radio value="redirect">{{ t('page.access.unauth_redirect') }}</t-radio>
                  <t-radio value="401">{{ t('page.access.unauth_401') }}</t-radio>
                </t-radio-group>
                <div class="form-tips">{{ t('page.access.config.unauth_action_tips') }}</div>
              </t-form-item>
              <t-form-item :label="t('page.access.config.label_pass_identity')" name="pass_identity_header">
                <t-radio-group v-model="formData.pass_identity_header">
                  <t-radio :value="0">{{ t('page.access.disable') }}</t-radio>
                  <t-radio :value="1">{{ t('page.access.enable') }}</t-radio>
                </t-radio-group>
                <div class="form-tips">{{ t('page.access.config.pass_identity_tips') }}</div>
              </t-form-item>
            </div>
          </t-tab-panel>
        </t-tabs>

        <!-- 保存按钮放在 tabs 外面：提交的是整个 formData，两个 tab 的改动一次保存 -->
        <div class="form-footer">
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
          <t-button variant="outline" :style="{ marginLeft: '12px' }" @click="getDetail">{{ t('common.reset') }}</t-button>
        </div>
      </t-form>
    </t-card>

    <t-dialog
      v-model:visible="regenerateVisible"
      :header="t('page.access.config.button_regenerate')"
      :body="t('page.access.config.regenerate_confirm')"
      @confirm="onRegenerate"
    />

    <!-- 开总开关是唯一能把整站锁住的动作，必须确认；关掉是止血动作，不拦 -->
    <t-dialog
      v-model:visible="enableConfirmVisible"
      :header="t('page.access.config.master_switch')"
      @confirm="onConfirmEnable"
      @close="onCancelEnable"
    >
      <template #body>
        <div>
          <p>{{ t('page.access.config.master_enable_confirm') }}</p>
          <t-alert
            v-if="!formData.center_origin"
            theme="error"
            :style="{ marginTop: '12px' }"
            :message="t('page.access.config.master_enable_no_center')"
          />
        </div>
      </template>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { MessagePlugin } from 'tdesign-vue-next';
import {
  wafAccessConfigDetailApi,
  wafAccessConfigSaveApi,
  wafAccessConfigRegenerateSecretApi,
  wafAccessConfigHostOptionsApi,
} from '@/apis/access';
import { wafIPGroupOptionsApi } from '@/apis/ipgroup';
import { get_detail_by_item_api, edit_system_config_by_item_api } from '@/apis/systemconfig';

// 总开关存在 system_config 的 access_enable 里，不在本页的 access_config 表。
// 走 editByItem 接口改，后端改完会顺手调 TaskLoadSetting 重载并发布运行时快照。
const MASTER_ITEM = 'access_enable';

const INITIAL_CONFIG = {
  center_origin: '',
  path_prefix: '/samwaf_access',
  cookie_prefix: 'samwaf_ac',
  session_ttl_minutes: 720,
  token_ttl_minutes: 720,
  ticket_ttl_seconds: 60,
  idle_timeout_minutes: 0,
  bind_ip: 0,
  bind_fingerprint: 0,
  require_otp: 0,
  max_fail_count: 10,
  lock_minutes: 3,
  global_exclude_paths: '',
  bypass_ip_group_code: '',
  service_token_header: '',
  // 服务令牌明文只在提交时传，后端只存 sha256；留空表示保持原样不动
  service_tokens: '',
  // 跨源(CORS)：全空即不启用，存量部署行为不变
  cors_allow_origins: '',
  cors_allow_methods: '',
  cors_allow_headers: '',
  cors_max_age: 0,
  unauth_action: 'auto',
  pass_identity_header: 0,
  force_secure_cookie: 0,
  cache_positive_ttl_sec: 60,
};

const { t } = useI18n();
const router = useRouter();

const activeTab = ref('basic');
// 换行只能从 JS 传：写在模板的 placeholder 属性里会被当成字面量 &#10; 显示出来
const excludePathsPlaceholder = '/healthz\n/api/webhook';
const formData = reactive<Record<string, any>>({ ...INITIAL_CONFIG });
const hasHmacSecret = ref(false);
const hasServiceToken = ref(false);
const regenerateVisible = ref(false);
const ipGroups = ref<Record<string, any>[]>([]);
const centerHostOptions = ref<Record<string, any>[]>([]);
const masterEnabled = ref(false);
const masterLoading = ref(false);
const enableConfirmVisible = ref(false);

function getDetail() {
  wafAccessConfigDetailApi()
    .then((res) => {
      if (res.code === 0 && res.data) {
        const d = res.data;
        Object.assign(formData, {
          ...INITIAL_CONFIG,
          center_origin: d.center_origin ?? '',
          path_prefix: d.path_prefix || INITIAL_CONFIG.path_prefix,
          cookie_prefix: d.cookie_prefix || INITIAL_CONFIG.cookie_prefix,
          session_ttl_minutes: d.session_ttl_minutes || INITIAL_CONFIG.session_ttl_minutes,
          token_ttl_minutes: d.token_ttl_minutes || INITIAL_CONFIG.token_ttl_minutes,
          ticket_ttl_seconds: d.ticket_ttl_seconds || INITIAL_CONFIG.ticket_ttl_seconds,
          idle_timeout_minutes: d.idle_timeout_minutes ?? 0,
          bind_ip: d.bind_ip ?? 0,
          bind_fingerprint: d.bind_fingerprint ?? 0,
          require_otp: d.require_otp ?? 0,
          max_fail_count: d.max_fail_count || INITIAL_CONFIG.max_fail_count,
          lock_minutes: d.lock_minutes || INITIAL_CONFIG.lock_minutes,
          global_exclude_paths: d.global_exclude_paths ?? '',
          bypass_ip_group_code: d.bypass_ip_group_code ?? '',
          service_token_header: d.service_token_header ?? '',
          service_tokens: '',
          cors_allow_origins: d.cors_allow_origins ?? '',
          cors_allow_methods: d.cors_allow_methods ?? '',
          cors_allow_headers: d.cors_allow_headers ?? '',
          cors_max_age: d.cors_max_age ?? 0,
          unauth_action: d.unauth_action || 'auto',
          pass_identity_header: d.pass_identity_header ?? 0,
          force_secure_cookie: d.force_secure_cookie ?? 0,
          cache_positive_ttl_sec: d.cache_positive_ttl_sec || INITIAL_CONFIG.cache_positive_ttl_sec,
        });
        // 密钥类字段后端不回显，只给"是否已设置"的标志位
        hasHmacSecret.value = d.has_hmac_secret === true;
        hasServiceToken.value = d.has_service_token === true;
      }
    })
    .catch((e: Error) => console.log(e));
}

function getIpGroups() {
  wafIPGroupOptionsApi()
    .then((res) => {
      if (res.code === 0) {
        ipGroups.value = res.data ?? [];
      }
    })
    .catch(() => {
      /* IP组接口不可用时不影响本页其余配置 */
    });
}

function getCenterHostOptions() {
  wafAccessConfigHostOptionsApi()
    .then((res) => {
      if (res.code === 0) {
        centerHostOptions.value = res.data ?? [];
      }
    })
    .catch(() => {
      /* 取不到候选不影响手填 */
    });
}

function gotoAccount() {
  router.push({ name: 'WafAccessAccount' });
}

function getMasterSwitch() {
  get_detail_by_item_api({ item: MASTER_ITEM })
    .then((res) => {
      if (res.code === 0 && res.data) {
        masterEnabled.value = String(res.data.value) === '1';
      }
    })
    .catch(() => {
      /* 读不到就当关闭，用户一点开关会立刻收到真实结果 */
    });
}

function applyMaster(on: boolean) {
  masterLoading.value = true;
  edit_system_config_by_item_api({ item: MASTER_ITEM, value: on ? '1' : '0' })
    .then((res) => {
      if (res.code === 0) {
        masterEnabled.value = on;
        MessagePlugin.success(on ? t('page.access.config.master_on_ok') : t('page.access.config.master_off_ok'));
      } else {
        MessagePlugin.warning(res.msg);
        getMasterSwitch();
      }
    })
    .catch(() => getMasterSwitch())
    .finally(() => {
      masterLoading.value = false;
    });
}

// 开总开关是唯一能把整站锁住的动作，先弹确认；关掉是止血动作，立即生效不打断
function onMasterChange(v: boolean) {
  if (v) {
    enableConfirmVisible.value = true;
    return;
  }
  applyMaster(false);
}

function onConfirmEnable() {
  enableConfirmVisible.value = false;
  applyMaster(true);
}

// 取消要把开关拨回去，否则界面显示"开"而库里是"关"
function onCancelEnable() {
  enableConfirmVisible.value = false;
  masterEnabled.value = false;
}

// 允许填一个不在候选里的地址（比如刚加完站点还没刷新页面），合法性由后端把关
function onCreateCenterOrigin(v: string) {
  const val = String(v || '').trim();
  if (!val) return;
  if (!centerHostOptions.value.some((h) => h.origin === val)) {
    centerHostOptions.value = [...centerHostOptions.value, { origin: val, label: val, host_code: '' }];
  }
  formData.center_origin = val;
}

function onSubmit({ firstError }: { firstError?: string }) {
  if (firstError) {
    MessagePlugin.warning(firstError);
    return;
  }
  // 认证中心域名是必填：整个功能就是"先跳到它登录"，没有它就无处可跳
  if (!String(formData.center_origin || '').trim()) {
    activeTab.value = 'basic';
    MessagePlugin.warning(t('page.access.config.center_origin_required'));
    return;
  }
  wafAccessConfigSaveApi({ ...formData }).then((res) => {
    if (res.code === 0) {
      MessagePlugin.success(res.msg);
      getDetail();
    } else {
      MessagePlugin.warning(res.msg);
    }
  });
}

function onRegenerate() {
  wafAccessConfigRegenerateSecretApi().then((res) => {
    if (res.code === 0) {
      MessagePlugin.success(res.msg);
      getDetail();
    } else {
      MessagePlugin.warning(res.msg);
    }
    regenerateVisible.value = false;
  });
}

onMounted(() => {
  getDetail();
  getIpGroups();
  getCenterHostOptions();
  getMasterSwitch();
});
</script>

<style scoped>
.master-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--td-radius-medium);
  border: 1px solid var(--td-component-stroke);
  background: var(--td-bg-color-container-hover);
}

.master-bar.is-on {
  border-color: var(--td-success-color-3);
  background: var(--td-success-color-1);
}

.master-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.master-title {
  font-weight: 600;
}

.master-tips {
  flex: 1;
  min-width: 260px;
  color: var(--td-text-color-secondary);
  font-size: 12px;
  line-height: 20px;
}

.tab-body {
  padding: 8px 0 0 0;
}

.form-footer {
  padding: 8px 0 0 0;
  border-top: 1px solid var(--td-component-stroke);
  margin-top: 8px;
}

.form-tips {
  color: var(--td-text-color-placeholder);
  font-size: 12px;
  line-height: 20px;
  margin-top: 4px;
  /* t-form-item 的控件区是 flex 容器，光靠 div 是块级元素并不会换行——
     说明文字会被挤到输入框右边一路溢出去。占满一行强制它换到下一行。 */
  flex-basis: 100%;
  width: 100%;
  max-width: 640px;
}

.unit {
  margin-left: 8px;
  color: var(--td-text-color-secondary);
}
</style>
