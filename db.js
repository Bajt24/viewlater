import Database from "better-sqlite3";
export class Db {

  constructor() {
    //-this.sqlite3 = require('sqlite3').verbose();
    this.db = new Database('db.sqlite');

    const res = this.checkTableExists();
    //console.log(res);
    if (res == null)
      this.createTable();

    console.log("====== V DATABAZI JE " + this.countRecords()+ " ZAZNAMU, TY KRIPLE ======");
  }

  countRecords() {
    return this.db.prepare("SELECT COUNT(*) as count FROM data").get()["count"];
  }

  deleteRecord(id){
    this.db.prepare("DELETE FROM data WHERE id = ?").run(id);
  }

  createTable() {
    this.db.prepare("CREATE TABLE data (id INTEGER PRIMARY KEY AUTOINCREMENT, userid TEXT, title TEXT, link TEXT, duration INTEGER, timestamp TEXT, read INTEGER, UNIQUE(userid, link))").run();
  }

  checkTableExists() {
    return this.db.prepare("SELECT name FROM sqlite_master WHERE name='data'").get();
  }

  getRecordsForUser(userid) {
    return this.db.prepare("SELECT * FROM data WHERE userid=?").all(userid);
  }

  saveItem(userid, title, link, duration){
    //id INTEGER, userid TEXT, link TEXT, duration INTEGER, timestamp TEXT, read INTEGER)
    try {
      this.db.prepare("INSERT INTO data (`userid`,`link`,`title`,`duration`,`timestamp`,`read`) VALUES (?,?,?,?,datetime('now'),0)").run(userid,link,title,duration);
      return true;
    } catch (err) {
      return false;
    }
  }

  setReadId(id){
    this.db.prepare("UPDATE data SET read = 1 WHERE id = ?").run(id);
  }

  getItem(userid, duration, usedItemIds = []){
    return this.db.prepare("SELECT * FROM data WHERE userid = ? AND read = 0 AND `id` NOT IN (?) ORDER BY ABS(? - duration), id ASC").all(userid, usedItemIds.join(), duration);
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