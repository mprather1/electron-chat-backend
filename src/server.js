import init from 'shintech-init-db'
var express = require('express')
var socket = require('socket.io')
var http = require('http')
var app = express()
var server = http.createServer(app)
var io = socket.listen(server)
var bodyParser = require('body-parser')
var bcrypt = require('bcryptjs')
const chalk = require('chalk')

const db = init({
  environment: 'development',
  config: {
    postgresURI: {
      development: 'postgres://postgres:postgres@localhost:5432/api_development'
    }
  }
})

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

server.on('listening', () => {
  console.log(chalk.magenta('listening...'))
})

server.on('request', (req, res, next) => {
  console.log(req.method, req.url)
})

app.route('/login')
.post((req, res, next) => {
  var body = []
  req.on('data', result => {
    body.push(result)
  })

  req.on('end', () => {
    body = JSON.parse(body.toString())
    db.one('SELECT username, password FROM users WHERE username = $1', body.username)
    .then(result => {
      var json = {}
      console.log(result.password, body.password)
      if (!bcrypt.compareSync(body.password, result.password)) {
        json['message'] = 'failure'
        res.json(json)
      } else {
        res.json({
          status: 'success'
        })
      }
    })
  })
})

app.route('/messages')
.post((req, res, next) => {
  var body = []
  req.on('data', data => {
    body.push(data)
  })

  req.on('end', () => {
    var retval = body
  db.none('insert into messages( content, author )' + 'values( ${content}, ${author} )', JSON.parse(retval.toString())) // eslint-disable-line
    .then(result => {
      io.sockets.emit('message', body)

      res.json({
        status: 'success'
      })
    })
  })
})

.get((req, res, next) => {
  db.any('SELECT * FROM messages')
  .then(result => {
    res.setHeader('Content-Type', 'application/json')
    res.status(200)
    .json(result)
  })
})

server.listen(55445, 'localhost')
