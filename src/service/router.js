const fs = require('fs')
const request = require('request')
const Router = require('koa-router')
const { mockResponse } = require('./mock')

function getProjectData(url, profileData) {
  return new Promise((resolve, reject) => {
    const cookie = request.cookie(`x-token=${profileData.token}`)
    const jar = request.jar()
    jar.setCookie(cookie, url)
    request({ url, jar }, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        resolve(body)
      } else {
        console.log(JSON.stringify(error))
        reject(error)
      }
    })
  })
}

const FILTER_SYS_TYPES = ['sys.folder', 'sys.http']

function buildRouter(folder, prefixs, profileData, router) {
  console.log('******      ' + folder.name + '      ****** Start')
  if (folder.children) {
    folder.children.forEach(_folder => {
      buildRouter(_folder, prefixs, profileData, router)
    })
  }
  if (FILTER_SYS_TYPES.indexOf(folder.type) < 0) return
  if (folder.content) {
    const requestContent = JSON.parse(folder.content)
    if (!requestContent.url) return
    const url = prefixs
      .reduce((a, c) => a.replace(c, '/api'), requestContent.url)
      .replace('/api/api', '/api')
    console.log('      ' + folder.name + ' ===> ' + url)
    router.all(url, async (ctx, next) => {
      if (profileData.inject[url]) {
        ctx.body = profileData.inject[url]
      } else {
        ctx.body = mockResponse(requestContent.responseArgs, profileData.dict)
      }
    })
  }
  console.log('******      ' + folder.name + '      ****** End')
}


async function genRouter(profile, prefixs) {
  const router = new Router()
  console.log('profile: ' + profile)
  const profileData = JSON.parse(fs.readFileSync(profile))
  // const apiUrl = `${profileData.host}api/project/${profileData.projectId}.json?token=${profileData.token}`
  const apiUrl = `${profileData.host}project/${profileData.projectId}/export/cn.xiaoyaoji.export.mjson/do`
  console.log('apiUrl: ' + apiUrl)
  console.log('token:' + profileData.token)
  const projectData = JSON.parse(await getProjectData(apiUrl, profileData))
  projectData.docs.forEach(doc => {
    buildRouter(doc, prefixs, profileData, router)
  })
  return router
}

module.exports = { genRouter }
