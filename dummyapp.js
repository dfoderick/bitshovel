/*
  This is a dummy application that never exits. It keeps the Docker container
  alive so that a developer can enter the container and debug the real application.
  See Dockerfile for usage.
*/

"use strict"

let i = 0

setInterval(function() {
  i++
}, 30000)
