<template>
  <t-drawer
    v-model:visible="showSettingPanel"
    size="408px"
    :footer="false"
    :header="t('page.right_setting.page_setting')"
    :close-btn="true"
    class="setting-drawer-container"
  >
    <div class="setting-container">
      <t-tabs default-value="theme" class="setting-tabs">
      <t-tab-panel value="theme" :label="t('page.right_setting.tab_theme')">
      <div class="setting-group-title">{{ t('page.right_setting.theme_mode') }}</div>
      <t-radio-group
        class="setting-mode-group"
        :value="settingStore.mode"
        @change="(v: any) => settingStore.updateConfig({ mode: v })"
      >
        <div v-for="item in modeOptions" :key="item.type" class="setting-mode-option">
          <t-radio-button :value="item.type" class="setting-mode-button">
            <img :src="item.icon" :alt="item.text" />
          </t-radio-button>
          <p class="setting-mode-label">{{ item.text }}</p>
        </div>
      </t-radio-group>

      <div class="setting-group-title">{{ t('page.right_setting.theme_color') }}</div>
      <t-radio-group
        class="setting-color-group"
        :value="settingStore.brandTheme"
        @change="(v: any) => settingStore.updateConfig({ brandTheme: v })"
      >
        <div v-for="item in COLOR_OPTIONS" :key="item.name" class="setting-color-option">
          <t-radio-button :value="item.name" class="setting-layout-color-group">
            <span class="color-block" :style="{ background: item.color }" />
          </t-radio-button>
        </div>
      </t-radio-group>

      <div class="setting-group-title">{{ t('page.right_setting.element_switches') }}</div>
      <t-form label-align="left">
        <t-form-item :label="t('page.right_setting.show_breadcrumb')" name="showBreadcrumb">
          <t-switch :value="settingStore.showBreadcrumb" @change="(v: any) => settingStore.updateConfig({ showBreadcrumb: v })" />
        </t-form-item>
        <t-form-item :label="t('page.right_setting.show_footer')" name="showFooter">
          <t-switch :value="settingStore.showFooter" @change="(v: any) => settingStore.updateConfig({ showFooter: v })" />
        </t-form-item>
      </t-form>

      <div class="setting-footer">
        <t-button theme="default" variant="outline" @click="handleClearSettings">
          {{ t('page.right_setting.clear_settings') }}
        </t-button>
      </div>
      </t-tab-panel>

      <t-tab-panel value="general" :label="t('page.right_setting.tab_general')">
        <div class="setting-group-title">{{ t('page.right_setting.local_timeout_title') }}</div>
        <div class="local-timeout-body">
          <t-input-number
            v-model="localTimeoutSec"
            :min="localTimeoutMinSec"
            :max="localTimeoutMaxSec"
            :step="1"
            theme="column"
            style="width: 150px"
          />
          <span class="local-timeout-unit">{{ t('page.right_setting.local_timeout_unit') }}</span>
          <t-button theme="primary" @click="saveLocalTimeout">{{ t('common.save') }}</t-button>
          <t-button variant="outline" @click="resetLocalTimeout">{{ t('page.right_setting.local_timeout_reset') }}</t-button>
        </div>
        <div class="local-timeout-tip">
          {{ t('page.right_setting.local_timeout_tip', { def: localTimeoutDefaultSec }) }}
        </div>
      </t-tab-panel>
      </t-tabs>
    </div>
  </t-drawer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import { useSettingStore } from '@/store/modules/setting';
import { COLOR_OPTIONS } from '@/config/color';
import {
  getRequestTimeout,
  setRequestTimeout,
  DEFAULT_REQUEST_TIMEOUT,
  MIN_REQUEST_TIMEOUT,
  MAX_REQUEST_TIMEOUT,
} from '@/config/requestTimeout';
import settingLightIcon from '@/assets/assets-setting-light.svg';
import settingDarkIcon from '@/assets/assets-setting-dark.svg';
import settingAutoIcon from '@/assets/assets-setting-auto.svg';

const { t } = useI18n();
const settingStore = useSettingStore();

// 前端请求超时（浏览器本地设置，单位秒）
const localTimeoutSec = ref(Math.round(getRequestTimeout() / 1000));
const localTimeoutMinSec = Math.round(MIN_REQUEST_TIMEOUT / 1000);
const localTimeoutMaxSec = Math.round(MAX_REQUEST_TIMEOUT / 1000);
const localTimeoutDefaultSec = Math.round(DEFAULT_REQUEST_TIMEOUT / 1000);

function saveLocalTimeout() {
  const savedMs = setRequestTimeout(Number(localTimeoutSec.value) * 1000);
  localTimeoutSec.value = Math.round(savedMs / 1000);
  MessagePlugin.success(t('page.right_setting.local_timeout_saved'));
}

function resetLocalTimeout() {
  const savedMs = setRequestTimeout(DEFAULT_REQUEST_TIMEOUT);
  localTimeoutSec.value = Math.round(savedMs / 1000);
  MessagePlugin.success(t('page.right_setting.local_timeout_saved'));
}

const modeOptions = computed(() => [
  { type: 'light', text: t('page.right_setting.theme_mode_color_light'), icon: settingLightIcon },
  { type: 'dark', text: t('page.right_setting.theme_mode_color_dark'), icon: settingDarkIcon },
  { type: 'auto', text: t('page.right_setting.theme_mode_color_auto'), icon: settingAutoIcon },
]);

const showSettingPanel = computed({
  get: () => settingStore.showSettingPanel,
  set: (v: boolean) => {
    settingStore.showSettingPanel = v;
  },
});

function handleClearSettings() {
  settingStore.resetConfig();
  MessagePlugin.success(t('page.right_setting.clear_settings_success'));
}
</script>

<!-- drawer 渲染在 body 下，scoped 样式不生效，使用全局选择器（同老项目处理方式） -->
<style>
.setting-drawer-container .setting-container {
  padding-bottom: 24px;
}

.setting-drawer-container .setting-group-title {
  font-size: 14px;
  line-height: 22px;
  margin: 32px 0 24px 0;
  text-align: left;
  font-weight: 500;
  color: var(--td-text-color-primary);
}

.setting-drawer-container .setting-group-title:first-child {
  margin-top: 0;
}

.setting-drawer-container .setting-mode-group,
.setting-drawer-container .setting-color-group {
  width: 100%;
  height: auto;
  min-height: 0;
  max-width: none;
  align-items: flex-start;
}

.setting-drawer-container .setting-mode-group {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.setting-drawer-container .setting-color-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
}

.setting-drawer-container .setting-mode-option,
.setting-drawer-container .setting-color-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
}

.setting-drawer-container .setting-mode-option {
  width: 100%;
}

.setting-drawer-container .setting-mode-button {
  display: flex !important;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 80px !important;
  min-width: 0;
  max-height: none !important;
  box-sizing: border-box;
  padding: 6px !important;
  overflow: hidden;
  border: 2px solid var(--td-component-border) !important;
  border-radius: 10px !important;
  background: var(--td-bg-color-container);
}

.setting-drawer-container .setting-mode-button > .t-radio-button__label {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 0 !important;
  overflow: hidden;
}

.setting-drawer-container .setting-mode-button img {
  display: block;
  flex: 0 0 auto;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.setting-drawer-container .setting-mode-label {
  margin: 8px 0 0;
  color: var(--td-text-color-primary);
  line-height: 22px;
  text-align: center;
}

.setting-drawer-container .setting-mode-button.t-is-checked {
  border-color: var(--td-brand-color) !important;
}

.setting-drawer-container .setting-layout-color-group {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  border-radius: 50% !important;
  padding: 6px !important;
  border: 2px solid transparent !important;
}

.setting-drawer-container .color-block {
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.setting-drawer-container .t-form__controls-content {
  justify-content: end;
}

.setting-drawer-container .setting-footer {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--td-component-border);
}

.setting-drawer-container .local-timeout-body {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.setting-drawer-container .local-timeout-unit {
  color: var(--td-text-color-secondary);
}

.setting-drawer-container .local-timeout-tip {
  color: var(--td-text-color-placeholder);
  font-size: 12px;
  margin-top: 12px;
  line-height: 1.6;
}
</style>
