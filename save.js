const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');
const http = require('http');

module.exports = async function save(url, output="file.jpg") {
  if (!url || typeof(url) !== 'string') throw new Error("A url informada não é válida!")
  if (output && typeof(output) !== 'string') throw new TypeError("output precisa ser uma string!")
  if (!/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/.test(url)) throw new TypeError("A url informada não é um link válido!")

  url = url.replace(/^(http)s?/, '$1')
  try {
    const db = await open({
      filename: './databases/imagens.sqlite',
      driver: sqlite3.Database
    })

    await db.exec('drop table if exists tbl') // remover
    await db.exec('CREATE TABLE IF NOT EXISTS tbl (nome varchar(10) PRIMARY KEY NOT NULL, bufferImage text UNIQUE)')
    // "bufferImage text UNIQUE" para não salvar arquivos repetidos (?)

    function str2ab(str) {
      var buf = new ArrayBuffer(str.length*2); // 2 bytes para cada caractér
      var bufView = new Uint16Array(buf);
      for (var i=0, strLen=str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
      }
      return bufView;
    }

    function str2ba(arr) {
      let novo = ""
      arr.forEach((byte) => novo += String.fromCharCode(byte))
      return novo
    }

    return http.get(url, function(res) {
      let imagedata = ''
      res.setEncoding('binary')
      res.on('data', async function(chunk) {
        imagedata += chunk
      })

      res.on('end', async function() {
        // Colocando na database o arquivo salvo
        await db.exec(`INSERT INTO tbl VALUES ('dulces', '${str2ab(imagedata)}')`)
        
        let { bufferImage } = await db.get('SELECT bufferImage FROM tbl')

        fs.writeFile(`images/${output}`, str2ba(bufferImage.split(",")), 'binary', function(err){
          if (err) throw err
          console.log('Arquivo '+ `\x1b[32m${output}` + ` \x1b[0msalvo.\nhttps://replit.com/@Lckun/Save-data-with-sqlite#images/${output}`)
        })

      })
    })
  } catch(e) {
    console.error(e)
  }
}