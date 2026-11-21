/** 素材出處與授權（App 內「關於」視窗顯示；與 README 的「素材來源與授權」一致） */
export interface Credit {
  /** 使用的素材 */
  what: string
  /** 出處名稱 */
  source: string
  author: string
  url: string
  license: string
  licenseUrl: string
}

export const CREDITS: readonly Credit[] = [
  {
    what: '注音發音',
    source: '《注音符號手冊》',
    author: '教育部',
    url: 'https://language.moe.gov.tw/001/Upload/files/site_content/M0001/juyin/index.html',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/deed.zh_TW',
  },
]
