const pathLink = require('path').resolve('.')
require(pathLink + '/server/public/db')
const config = require(pathLink + '/config')
const coinInfo = require(pathLink + '/config/coinInfo.js')
const logger = require(pathLink + '/server/public/methods/log4js.js').getLogger('tickers')
const $$  = require(pathLink + '/server/public/methods/tools.js')
const mongoose = require('mongoose')
const async = require('async')

const express = require('express'); //1
const router = express(); //2

const TxnsCharts = mongoose.model('TxnsCharts')

let tickersObj ={}

function getTickers () {
  const NOW_TIME = Date.now()
  const query24h = {timestamp: {$gte: ((NOW_TIME / 1000) - (60 * 60 * 24))}}
  TxnsCharts.aggregate([
    {$match: {
      ...query24h,
    }},
    {$sort: {'timestamp': 1} },
    {$group: {
      _id: '$pairs',
      last_price: {$last: '$market'},
      target_volume: {$sum: '$fv'},
      base_volume: {$sum: '$tv'},
      bid: {$last: '$market'},
      ask: {$last: '$market'},
      high: {$max: '$market'},
      low: {$min: '$market'},
    }},
    {$project: {
      ticker_id: '$_id',
      base_currency: '$_id',
      target_currency: 'FSN',
      last_price: '$last_price',
      target_volume: '$target_volume',
      base_volume: '$base_volume',
      bid: '$bid',
      ask: '$ask',
      high: '$high',
      low: '$low',
    }},
    {$sort: {'timestamp': 1} },
  ]).exec((err, res) => {
    if (err) {
      logger.error(err)
    } else {
      for (let obj of res) {
        let obj1 = {
          ticker_id: obj.ticker_id + '_FSN',
          base_currency: obj.ticker_id,
          target_currency: 'FSN',
          last_price: obj.last_price.toString(),
          base_volume: obj.base_volume.toString(),
          target_volume: obj.target_volume.toString(),
          bid: obj.bid.toString(),
          ask: obj.ask.toString(),
          high: obj.high.toString(),
          low: obj.low.toString(),
        }
        tickersObj[obj1.ticker_id] = obj1
      }
    }
    setTimeout(() => {
      getTickers()
    }, 1000 * 10)
  })
}

getTickers()

router.get('/ticker', (request, response) => {
  let params = request.query
  if (params.ticker_id && params.ticker_id.indexOf('_') === -1) {
    response.send({
      error: 'Params is error!'
    })
    return
  }
  if (params.ticker_id && tickersObj[params.ticker_id]) {
    let obj1 = tickersObj[params.ticker_id]
    let pairsObj = {
      base_id: obj1.target_currency,
      quote_id: obj1.ticker_id,
      last_price: obj1.last_price,
      base_volume: obj1.base_volume,
      quote_volume: obj1.target_volume,
      isFrozen: 1
    }
    response.send(pairsObj)
  } else if (params.ticker_id && !tickersObj[params.ticker_id]) {
    response.send({})
  } else {
    let pairsObj = {}
    for (let obj in tickersObj) {
      // arr.push(tickersObj[obj])
      let obj1 = tickersObj[obj]
      pairsObj[obj] = {
        base_id: obj1.target_currency,
        quote_id: obj1.ticker_id,
        last_price: obj1.last_price,
        base_volume: obj1.base_volume,
        quote_volume: obj1.target_volume,
        isFrozen: 1
      }
    }
    response.send(pairsObj)
  }
})

router.get('/api/tickers', (request, response) => {
  let params = request.query
  if (params.ticker_id && params.ticker_id.indexOf('_') === -1) {
    response.send({
      error: 'Params is error!'
    })
    return
  }
  if (params.ticker_id && tickersObj[params.ticker_id]) {
    response.send(tickersObj[params.ticker_id])
  } else if (params.ticker_id && !tickersObj[params.ticker_id]) {
    response.send({})
  } else {
    let arr = []
    for (let obj in tickersObj) {
      arr.push(tickersObj[obj])
    }
    response.send(arr)
  }
})

module.exports = router