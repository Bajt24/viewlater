import Database from "better-sqlite3";
export class Db {
  
  constructor() {
    //-this.sqlite3 = require('sqlite3').verbose();
    this.db = new Database('db.sqlite');
    
    const res = this.checkTableExists();
    //console.log(res);
    if (res == null)
      this.createTable();
  }
  
  createTable() {
      this.db.prepare("CREATE TABLE data (id INTEGER PRIMARY KEY AUTOINCREMENT, userid TEXT, link TEXT, duration INTEGER, timestamp TEXT, read INTEGER)").run();
  }
  
  checkTableExists() {
      return this.db.prepare("SELECT name FROM sqlite_master WHERE name='data'").get();
  }
  
  getRecordsForUser(userid) {
      return this.db.prepare("SELECT * FROM data WHERE userid=?").all(userid);
  }
  
  saveItem(userid, link, duration){
    //id INTEGER, userid TEXT, link TEXT, duration INTEGER, timestamp TEXT, read INTEGER)
    this.db.prepare("INSERT INTO data (userid,link,duration,timestamp,read) VALUES (?,?,?,now(),0)").run(userid,link,duration);
  }
  
  setReadId(id){
    const stmt = this.db.prepare("UPDATE data SET read = 1 WHERE id = ?");
    stmt.run(id);
    stmt.finalize();
  }
}