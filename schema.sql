
CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama_event   VARCHAR(255) NOT NULL,
  tanggal_event DATE NOT NULL,
  lokasi_event VARCHAR(255) NOT NULL,
  pic_event    VARCHAR(255) NOT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS participants (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  event_id      INT NOT NULL,
  nama          VARCHAR(255) NOT NULL,
  asal_instansi VARCHAR(255) NOT NULL,
  jabatan       VARCHAR(255) NOT NULL,
  signature     LONGTEXT NOT NULL,           
  latitude      DECIMAL(10,7) NULL,
  longitude     DECIMAL(10,7) NULL,
  presensi_at   DATETIME DEFAULT CURRENT_TIMESTAMP, 
  CONSTRAINT fk_participants_event
    FOREIGN KEY (event_id) REFERENCES events(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_participants_event_id ON participants(event_id);
