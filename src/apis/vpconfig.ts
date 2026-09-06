import request from '@/utils/request';

/** 更新管理端 IP 白名单 */
export function updateIpWhitelistApi(data: Record<string, any>) {
  return request({
    url: 'vipconfig/updateIpWhitelist',
    method: 'post',
    data,
  });
}

/** 获取管理端 IP 白名单 */
export function getIpWhitelistApi(params: Record<string, any>) {
  return request({
    url: 'vipconfig/getIpWhitelist',
    method: 'get',
    params,
  });
}

/** 获取管理端可信代理网段 */
export function getManageTrustedProxiesApi(params: Record<string, any>) {
  return request({
    url: 'vipconfig/getManageTrustedProxies',
    method: 'get',
    params,
  });
}

/** 更新管理端可信代理网段 */
export function updateManageTrustedProxiesApi(data: Record<string, any>) {
  return request({
    url: 'vipconfig/updateManageTrustedProxies',
    method: 'post',
    data,
  });
}

/** 获取管理端引用的 CDN 厂商码 */
// 管理端「本次访问」真实IP诊断（只回显本次请求自身的判定过程）
export function manageClientIpProbeApi(params: Record<string, any>) {
  return request({
    url: 'vipconfig/manageClientIpProbe',
    method: 'get',
    params,
  });
}
export function getManageCDNProviderApi(params: Record<string, any>) {
  return request({
    url: 'vipconfig/getManageCDNProvider',
    method: 'get',
    params,
  });
}

/** 更新管理端引用的 CDN 厂商码(设置后自动信任该厂商中心库最新回源段) */
export function updateManageCDNProviderApi(data: Record<string, any>) {
  return request({
    url: 'vipconfig/updateManageCDNProvider',
    method: 'post',
    data,
  });
}

/** 分页浏览某 CDN 厂商回源段(只读) */
export function getCdnProviderRangesApi(params: Record<string, any>) {
  return request({
    url: 'vipconfig/cdnProviderRanges',
    method: 'get',
    params,
  });
}

/** 获取CORS跨域来源白名单 */
export function getCorsAllowOriginsApi(params: Record<string, any>) {
  return request({
    url: 'vipconfig/getCorsAllowOrigins',
    method: 'get',
    params,
  });
}

/** 更新CORS跨域来源白名单 */
export function updateCorsAllowOriginsApi(data: Record<string, any>) {
  return request({
    url: 'vipconfig/updateCorsAllowOrigins',
    method: 'post',
    data,
  });
}

/** 更新SSL启用状态 */
export function updateSslEnableApi(data: Record<string, any>) {
  return request({
    url: 'vipconfig/updateSslEnable',
    method: 'post',
    data,
  });
}

/** 获取SSL状态 */
export function getSslStatusApi(params: Record<string, any>) {
  return request({
    url: 'vipconfig/getSslStatus',
    method: 'get',
    params,
  });
}

/** 上传SSL证书 */
export function uploadSslCertApi(data: Record<string, any>) {
  return request({
    url: 'vipconfig/uploadSslCert',
    method: 'post',
    data,
  });
}

/** 重启管理端 */
export function restartManagerApi(data: Record<string, any>) {
  return request({
    url: 'vipconfig/restartManager',
    method: 'post',
    data,
  });
}

/** 获取安全路径入口配置 */
export function getSecurityEntryApi(params: Record<string, any>) {
  return request({
    url: 'vipconfig/getSecurityEntry',
    method: 'get',
    params,
  });
}

/** 更新安全路径入口配置 */
export function updateSecurityEntryApi(data: Record<string, any>) {
  return request({
    url: 'vipconfig/updateSecurityEntry',
    method: 'post',
    data,
  });
}

/** 获取通知标题前缀 */
export function getNoticeTitleApi(params: Record<string, any>) {
  return request({
    url: 'vipconfig/getNoticeTitle',
    method: 'get',
    params,
  });
}

/** 更新通知标题前缀 */
export function updateNoticeTitleApi(data: Record<string, any>) {
  return request({
    url: 'vipconfig/updateNoticeTitle',
    method: 'post',
    data,
  });
}

/** 获取管理端仅允许HTTPS开关 */
export function getSslForceHttpsApi(params: Record<string, any>) {
  return request({
    url: 'vipconfig/getSslForceHttps',
    method: 'get',
    params,
  });
}

/** 更新管理端仅允许HTTPS开关 */
export function updateSslForceHttpsApi(data: Record<string, any>) {
  return request({
    url: 'vipconfig/updateSslForceHttps',
    method: 'post',
    data,
  });
}

/** 获取管理端证书绑定的证书夹 */
export function getSslBindCertApi(params: Record<string, any>) {
  return request({
    url: 'vipconfig/getSslBindCert',
    method: 'get',
    params,
  });
}

/** 绑定/解绑管理端证书到证书夹（ssl_config_id 传空表示解绑） */
export function updateSslBindCertApi(data: Record<string, any>) {
  return request({
    url: 'vipconfig/updateSslBindCert',
    method: 'post',
    data,
  });
}

/** 获取域名白名单 */
export function getDomainWhitelistApi(params: Record<string, any>) {
  return request({
    url: 'vipconfig/getDomainWhitelist',
    method: 'get',
    params,
  });
}

/** 更新域名白名单 */
export function updateDomainWhitelistApi(data: Record<string, any>) {
  return request({
    url: 'vipconfig/updateDomainWhitelist',
    method: 'post',
    data,
  });
}

/** 获取管理端本地证书状态（本地CA是否存在、当前证书是否本地签发、SAN 与到期时间） */
export function getLocalCertStatusApi(params?: Record<string, any>) {
  return request({
    url: 'vipconfig/localCertStatus',
    method: 'get',
    params,
  });
}

/** 生成/重新签发管理端本地证书（同一批访问地址重签即为续期，CA 不变、已导入的信任不受影响） */
export function generateLocalCertApi(data: Record<string, any>) {
  return request({
    url: 'vipconfig/generateLocalCert',
    method: 'post',
    data,
  });
}

/** 重建本地CA（作废旧根证书，破坏性操作：所有导入过旧根证书的电脑都要重新导入） */
export function rotateLocalCaApi(data: Record<string, any>) {
  return request({
    url: 'vipconfig/rotateLocalCa',
    method: 'post',
    data,
  });
}

/** 清除本地CA与本地证书（需先关闭SSL或改用其它来源） */
export function clearLocalCertApi(data?: Record<string, any>) {
  return request({
    url: 'vipconfig/clearLocalCert',
    method: 'post',
    data,
  });
}
