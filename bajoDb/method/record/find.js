import unsupported from '../../generic/unsupported.js'
import prepFetch from '../../generic/prep-fetch.js'
import transform from '../../generic/transform.js'

async function find ({ schema, filter = {}, options = {} } = {}) {
  const { importModule } = this.bajo.helper
  const { get, has, isPlainObject, invert, isFunction } = this.bajo.helper._
  const { getInfo, prepPagination } = this.bajoDb.helper
  const { fetch } = this.bajoExtra.helper
  const { driver, connection } = getInfo(schema)
  const { dataOnly, qsKey, responseKey } = connection.options
  const prefix = driver.provider ? `${driver.provider}:/bajoDbRestproxy` : 'bajoDbRestproxy:/bajoDb'
  const mod = await importModule(`${prefix}/lib/${driver.type}/record-find.js`)
  if (!mod) return unsupported.call(this)
  let { url, opts, ext } = await prepFetch.call(this, schema, 'find')
  const { limit, page, sort } = await prepPagination(filter, schema)
  filter.limit = limit
  filter.page = page
  const fm = invert(connection.fieldsMap)
  const newSort = {}
  for (const s in sort) {
    newSort[fm[s] ?? s] = sort[s]
  }
  filter.sort = newSort
  let resp
  if (isFunction(mod)) ({ url, opts, ext, resp } = await mod.call(this, { url, opts, ext, schema, filter, options }))
  for (const k in qsKey) {
    if (has(filter, k)) {
      const val = isPlainObject(filter[k]) ? JSON.stringify(filter[k]) : filter[k]
      opts.params[qsKey[k]] = val
    }
  }
  if (!resp) resp = await fetch(url, opts, ext)
  const result = {
    data: dataOnly === true || (Array.isArray(dataOnly) && dataOnly.includes('find')) ? resp : resp[get(responseKey, 'data')],
    page: resp[get(responseKey, 'page')] ?? filter.page,
    limit: resp[get(responseKey, 'limit')] ?? filter.limit,
    count: resp[get(responseKey, 'count')],
    pages: resp[get(responseKey, 'pages')]
  }
  result.data = await transform.call(this, result.data, schema)
  return result
}

export default find
