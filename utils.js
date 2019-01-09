let parseCommand = function parseCommand(command, msg) {
    const words = splitString(msg)
    console.log(words)
    return {
        "command": command,
        "action": words[0].toLowerCase(),
        "name": words[1].toLowerCase(),
        "parameter": words[2]
    }
}

let splitString = function splitString(s) {
  let clean = naiveClean(s)
  //finds the tokens in a string
  let matches = clean.match(/[\""].+?[\""]|[^ ]+/g)
  //console.log(matches)
  //but surrounding quotes are still there so remove
  if (matches) {
    for (var i=0, len=matches.length; i<len; i++) {
      matches[i] = matches[i].replace(/^"(.*)"$/, '$1')
    }
  }
  return matches
}

function naiveClean(s) {
  return s.replace(/\"\"/g,"\"")
}

let cleanQuotes = function cleanQuotes(s) {
  clean = s
  if (clean.startsWith("\"") && clean.endsWith("\"")) {
    clean = clean.substr(1).slice(0,-1)
  }
  if (clean.startsWith("\'") && clean.endsWith("\'")) {
    clean = clean.substr(1).slice(0,-1)
  }
  return clean
}

let urlString = function urlString(url, query) {
    let b64 = Buffer.from(query).toString('base64')
    //console.log(b64);
    return url + b64;
}

let isStart = function isStart(action) { return action.toLowerCase() === 'on' || action.toLowerCase() === 'start'}
let isStop = function isStop(action) { return action.toLowerCase() === 'off' || action.toLowerCase() === 'stop'}

module.exports = {
  parseCommand: parseCommand,
  splitString: splitString,
  cleanQuotes: cleanQuotes,
  urlString: urlString,
  isStart: isStart,
  isStop: isStop
}
