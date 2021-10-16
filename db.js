import Database from "better-sqlite3";
export class Db {

  constructor() {
    //-this.sqlite3 = require('sqlite3').verbose();
    this.db = new Database('db.sqlite');

    const res = this.checkTableExists();
    //console.log(res);
    if (res == null)
      this.createTable();

    console.log("====== V DATABAZI JE " + this.countRecords()["count"] + " ZAZNAMU, TY KRIPLE ======");
  }

  countRecords() {
    return this.db.prepare("SELECT COUNT(*) as count FROM data").get();
  }

  deleteRecord(id){
    this.db.prepare("DELETE FROM data WHERE id = ?").run(id);
  }

  createTable() {
    this.db.prepare("CREATE TABLE data (id INTEGER AUTOINCREMENT, userid TEXT, link TEXT, duration INTEGER, timestamp TEXT, read INTEGER, PRIMARY KEY(id,userid))").run();
  }

  checkTableExists() {
    return this.db.prepare("SELECT name FROM sqlite_master WHERE name='data'").get();
  }

  getRecordsForUser(userid) {
    return this.db.prepare("SELECT * FROM data WHERE userid=?").all(userid);
  }

  saveItem(userid, link, duration){
    //TODO DONT INSERT DUPLICATE
    //id INTEGER, userid TEXT, link TEXT, duration INTEGER, timestamp TEXT, read INTEGER)
    console.log(this.db.prepare("INSERT INTO data (userid,link,duration,timestamp,read) VALUES (?,?,?,datetime('now'),0)").run(userid,link,duration));
  }

  setReadId(id){
    this.db.prepare("UPDATE data SET read = 1 WHERE id = ?").run(id);
  }

  getRandomItem(userid, duration, ignore) {

  }

  getItem(userid, duration){
    return this.db.prepare("SELECT * FROM data WHERE userid = ? AND read = 0 ORDER BY ABS(? - duration), id ASC").all(userid, duration);
    /*
    this.db.prepare("SELECT * FROM data WHERE userid = ? AND read = 0 ORDER BY ABS(? - duration)", [userid, duration], (err, rows) => {
    if (err) {
      throw err;
    }
    rows.forEach((row) => {
      console.log(row.name);
    });
      return rows;
  });
  */
  }
}