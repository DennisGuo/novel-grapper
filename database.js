const sqlite3 = require('sqlite3');

let db = new sqlite3.Database("./db/book.db", err => {
  if (err) {
    console.error(err.message);
    return;
  }
  console.log("Connected to the database.");
  // create table

  db.serialize(() => {
    let sqls = [`
        create table if not exists book (
          id integer primary key autoincrement,
          title text,
          link text,
          category text,
          content text,
          ad text
        )`,
      `create table if not exists cheapter(
          id integer primary key autoincrement,
          book_id integer ,
          content text,
          link text,
          title text,
          sort integer,
          status integer default 0,
          foreign key (book_id) references book(id) on delete cascade on update no action
      )`];
    sqls.forEach(sql => {
      db.run(sql, err => {
        if (err) {
          console.log(err);
        } else {
          // console.log(sql.trim());
        }
      });
    })
  });
});

const saveBook = (book, callback) => {
  db.serialize(() => {
    db.run('insert into book(title,link,category,content,ad) values(?,?,?,?,?)', [book.title, book.link, book.category, book.content, book.ad], function (err) {
      if (err) {
        console.log(err);
        callback && callback(false)
      } else {
        let id = this.lastID;
        savaCheapters(id, book.cheapter, res => {
          if (res) {
            callback && callback(true);
          } else {
            callback && callback(false);
          }
        })
      }
    })
  })
}

const getBook = (page, size, callback) => {
  db.get('select count(1) total from book', (err, count) => {
    if (err) {
      console.log(err);
      callback({
        success: false,
        message: err.message
      })
    } else {
      let total = count.total;
      db.all(`select b.id,b.title,
      (select count(1) from cheapter where book_id = b.id) total, 
      (select count(1) from cheapter where book_id = b.id and status = 1) over 
      from book b order by b.id desc limit ? offset ? `, [size, page * size], (err2, rows) => {
        if (err2) {
          console.log(err2);
        } else {
          callback({
            success: true,
            data: {
              total,
              rows,
            }
          })
        }
      });


    }
  });
}

const getUnOverCheapter = (size, callback) => {
  db.get('select count(1) total from cheapter where status = 0', (err, count) => {
    if (err) {
      console.log(err);
      callback({ success: false, message: err.message });
    } else {
      let total = count.total;
      if (total > 0) {
        db.all('select c.id,c.link,b.content,b.ad from cheapter c left join book b on (c.book_id = b.id) where c.status = 0 limit ?', [size], (err2, rows) => {
          if (err2) {
            console.log(err2);
            callback({ success: false, message: err2.message });
          } else {
            callback({
              success: true,
              data: {
                total,
                rows,
              }
            })
          }
        });
      } else {
        callback({
          success: true,
          data: {
            total: 0, rows: []
          }
        })
      }
    }
  });
}


const savaCheapters = (id, cheapters, callback) => {
  db.serialize(() => {
    let values = [];
    for (var i = 0; i < cheapters.length; i++) {
      let item = cheapters[i];
      values.push([id, item.link, item.title, '', i + 1]);
    }
    db.run("begin transaction");
    values.forEach(item => {
      db.run('insert into cheapter(book_id,link,title,content,sort) values(?,?,?,?,?) ', item);
    })
    db.run("commit");
    callback && callback(true)
  })
}

const getBookByLink = (link, callback) => {
  db.get('select * from book where link = ?', [link], (err, row) => {
    if (err) {
      callback && callback(null)
    }
    callback && callback(row);
  })
}

const setCheapterContent = (id, content) => {
  db.serialize(() => {
    db.run('update cheapter set content = ?,status = 1 where id= ? ', [content, id], err => {
      if (err) {
        console.log(err);
      }
    })
  });
}

const getBookById = (id, callback) => {
  db.get("select * from book where id = ? ", [id], (err, book) => {
    if (err) {
      console.log(err);
      callback({ success: false, message: err.message });
    } else {
      db.all('select * from cheapter where book_id = ? order by sort', [book.id], (err2, cheapter) => {
        if (err2) {
          console.log(err2);
          callback({ success: false, message: err2.message });
        } else {
          book.cheapter = cheapter;
          callback({
            success: true,
            data: book
          });
        }
      });
    }
  })
}

module.exports = {
  db,
  saveBook,
  savaCheapters,
  getBook,
  getBookById,
  getBookByLink,
  getUnOverCheapter,
  setCheapterContent,
};
