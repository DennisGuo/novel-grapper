const url = require("url");
var http = require("http");
var iconv = require("iconv-lite");

const cheerio = require("cheerio");
const express = require("express");
const app = express();
const port = 3000;

const db = require("./server/database");
const cache = require("./server/cache");

// http.globalAgent =
//     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.116 Safari/537.36";

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// 获取规则
app.get('/rule', (req, res) => {
  db.getRule(rs => {
    res.json(rs);
  })
})
// 保存规则
app.post('/rule', (req, res) => {
  let rule = req.body;
  db.saveRule(rule, rs => {
    res.json(rs);
  })
})
// 删除规则
app.delete('/rule/:id', (req, res) => {
  let id = req.params.id;
  db.removeRule(id, rs => {
    res.json(rs);
  })
})

// 获取书籍和目录信息
app.post("/category", (req, res) => {
  let item = req.body;
  let link = item.link;
  let uri = url.parse(link);
  let origin = uri.protocol + "//" + uri.host;
  let domain = uri.host;
  db.findRuleByDomain(domain, rule => {
    if (!rule) {
      res.json({ success: false, message: '没有此网站的抓取规则，请先进行添加' });
    } else {

      item.rule = rule;

      db.getBookByLink(link, book => {
        if (book) {
          // console.log(res);e
          res.json({
            success: true,
            data: book
          });
        } else {
          // {
          //     url: 'http://www.biquge001.com/Book/1/1012/',
          //     category: '#list a',
          //     content: '#content',
          //     ad: '<font color=red>笔趣阁</font>已启用最新域名：www.<font color=red>biquge001</font>.com ，请大家牢记最新域名并相互转告，谢谢！'
          //   }
          getContent(link, body => {
            // console.log(body);

            var $ = cheerio.load(body);


            item.title = $('meta[property="og:title"]').attr('content');            // 标题
            item.author = $('meta[property="og:novel:author"]').attr('content');    // 作者
            item.avatar = $('meta[property="og:image"]').attr('content');      // 封面
            item.description = $('meta[property="og:description"]').attr('content');      // 封面

            let cheapter = [];
            $(rule.category).each((index, e) => {
              let el = $(e);
              let title = el.text();
              //   let title = iconv.decode(el.text(), "gbk").toString();
              cheapter.push({
                title,
                domain,
                link: origin + el.attr("href")
              });
            });
            let data = { ...item, cheapter };
            cache.set(link, data);
            res.json({
              success: true,
              data
            });
          });
        }
      });
    }
  });
});

app.post("/content", (req, res) => {
  let item = req.body;
  let link = item.link;

  let uri = url.parse(link);
  let domain = uri.host;

  db.findRuleByDomain(domain, rule => {
    if (rule) {
      getCheapter(link, rule.content, rule.ad, data => {
        res.json({
          success: true,
          data
        });
      });
    }else{
      res.json({ success: false, message: '没有此网站的抓取规则，请先进行添加' });
    }
  });

});
// 开始抓取任务
app.post('/start', (req, res) => {
  let item = req.body;
  let link = item.link;

  let task = cache.get(link);
  console.log('start url : ' + link);
  if (task) {
    db.saveBook(task, success => {
      res.json({
        success
      })
    });
  } else {
    res.json({
      success: false,
      message: '任务不存在！',
    })
  }
})

app.get('/book', (req, res) => {
  let page = parseInt(req.query.page || '0'), size = parseInt(req.query.size || '10');

  db.getBook(page, size, data => {
    res.json(data);
  });

});

app.get('/download', (req, res) => {
  let id = req.query.id;
  db.getBookById(id, rs => {
    if (rs.success) {
      let book = rs.data;
      let arr = [], total = 0;
      let rt = Buffer.from('\r\n\r\n');
      for (let i = 0; i < book.cheapter.length; i++) {
        let cp = book.cheapter[i];
        let bf = Buffer.from(cp.content);
        arr.push(bf);
        arr.push(rt)
        total += bf.length + rt.length;
      }

      let data = Buffer.concat(arr, total);

      res.set({
        'Content-Type': 'text/plain',
        "Content-Disposition": `attachment;filename=${encodeURIComponent(book.title)}.txt`
      });
      res.send(data);

    } else {
      res.json({
        message: res.message
      })
    }
  });
});



// 以下是方法区域
// 以下是方法区域
// 以下是方法区域


const getContent = (link, callback) => {
  let uri = url.parse(link);
  let { host, path, protocol } = uri;
  let options = {
    host,
    path,
    protocol,
    headers: {
      Host: host,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.116 Safari/537.36"
    }
  };
  // console.log(options);
  try {
    http.get(options, function (res) {
      var htmlData = [];
      var htmlDataLength = 0;
      var count = 0;
      res.on("data", function (data) {
        htmlData.push(data);
        htmlDataLength += data.length;
        count++;
      });

      res.on("end", function () {
        var bufferHtmlData = Buffer.concat(htmlData, htmlDataLength);
        var charset = "";
        var decodeHtmlData;
        var htmlHeadCharset = "";
        var htmlHeadContent = "";
        var index = 0;

        var $ = cheerio.load(bufferHtmlData, { decodeEntities: false });

        $("meta", "head").each(function (i, e) {
          htmlHeadCharset = $(e).attr("charset");
          htmlHeadContent = $(e).attr("content");

          if (typeof htmlHeadCharset != "undefined") {
            charset = htmlHeadCharset;
          }

          if (typeof htmlHeadContent != "undefined") {
            if (htmlHeadContent.match(/charset=/gi)) {
              index = htmlHeadContent.indexOf("=");
              charset = htmlHeadContent.substring(index + 1);
            }
          }
        });

        //此处为什么需要对整个网页进行转吗，是因为cheerio这个组件不能够返回buffer,iconv则无法转换之
        if (charset.match(/gb/gi)) {
          decodeHtmlData = iconv.decode(bufferHtmlData, "gbk");
        } else {
          //因为有可能返回的网页中不存在charset字段，因此默认都是按照utf8进行处理
          decodeHtmlData = iconv.decode(bufferHtmlData, "utf8");
        }
        callback && callback(decodeHtmlData);
      });
    });
  } catch (e) {
    console.log(e);
  }
};

const getCheapter = (link, selector, ad, callback) => {
  getContent(link, body => {
    var $ = cheerio.load(body);
    let data = $(selector).text();
    if (ad) {
      let ads = ad.split("\n");
      for (let i = 0; i < ads.length; i++) {
        let ad = ads[i].trim().replace(/\\n\\t/g, "");
        var index = 0;
        do {
          data = data.replace(ad, "");
        } while ((index = data.indexOf(ad, index + 1)) > -1);
      }
    }
    data = data.trim();

    callback(data);

  });
}

// 开启定时任务，获取未完成的任务
setInterval(() => {
  let size = 100; //每次获取未完成的内容

  db.getUnOverCheapter(size, res => {
    if (res.success) {
      let { total, rows } = res.data;
      if (total > 0) {
        console.log('Total unfinished cheapter count : ' + total);
        rows.forEach(item => {
          fetchCheapter(item)
        });
      }
    }
  });

}, 3 * 1000);
// 执行抓取cheapter 任务
const fetchCheapter = (item) => {
  let { link, content, ad, id } = item;
  getCheapter(link, content, ad, data => {
    if (data) {
      db.setCheapterContent(id, data);
    }
  })
}

app.listen(port, () => console.log(`Example app listening on port ${port}!\nhttp://127.0.0.1:${port}`));
