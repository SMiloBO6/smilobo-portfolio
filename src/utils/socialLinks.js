function cleanHandle(value) {
  return String(value || '').trim().replace(/^@/, '')
}

function externalLink(href) {
  return href
    ? {
        href,
        target: '_blank',
        rel: 'noreferrer'
      }
    : {
        href: '',
        target: undefined,
        rel: undefined
      }
}

export function getSocialLinks(personal) {
  const xiaohongshu = cleanHandle(personal.xiaohongshu)
  const douyin = String(personal.douyin || '').trim()
  const instagram = cleanHandle(personal.instagram)
  const website = String(personal.website || '').trim()

  return {
    email: {
      label: '邮箱',
      value: personal.email,
      href: personal.email ? 'mailto:' + personal.email : ''
    },
    xiaohongshu: Object.assign({
      label: '小红书',
      value: personal.xiaohongshu
    }, externalLink(
      personal.xiaohongshuUrl ||
      (xiaohongshu
        ? 'https://www.xiaohongshu.com/search_result?keyword=' + encodeURIComponent(xiaohongshu)
        : '')
    )),
    douyin: Object.assign({
      label: '抖音',
      value: personal.douyin
    }, externalLink(
      personal.douyinUrl ||
      (douyin ? 'https://www.douyin.com/search/' + encodeURIComponent(douyin) : '')
    )),
    instagram: Object.assign({
      label: 'Instagram',
      value: personal.instagram
    }, externalLink(
      personal.instagramUrl ||
      (instagram ? 'https://www.instagram.com/' + instagram.toLowerCase() + '/' : '')
    )),
    website: Object.assign({
      label: '个人网站',
      value: personal.website
    }, externalLink(/^https?:\/\//i.test(website) ? website : '')),
    city: {
      label: '城市',
      value: personal.city,
      href: ''
    }
  }
}
