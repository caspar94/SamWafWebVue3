import request from '@/utils/request';

/** 网站密码访问 - 在线会话列表 */
export function wafHttpAuthSessionListApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/httpauthsession/list',
    method: 'post',
    data: params,
  });
}

/** 网站密码访问 - 踢下线单条会话 */
export function wafHttpAuthSessionKickApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/httpauthsession/kick',
    method: 'get',
    params,
  });
}

/** 网站密码访问 - 踢下线某用户在本站点的全部会话 */
export function wafHttpAuthSessionKickByUserApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/httpauthsession/kickbyuser',
    method: 'post',
    data: params,
  });
}

/** 网站密码访问 - 清空本站点全部会话 */
export function wafHttpAuthSessionKickAllApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/httpauthsession/kickall',
    method: 'post',
    data: params,
  });
}
