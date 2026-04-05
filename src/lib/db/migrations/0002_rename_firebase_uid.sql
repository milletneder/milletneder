-- firebase_uid sütununu anon_uid olarak yeniden adlandır
-- Veri kaybı yok, sadece sütun ve index ismi değişiyor
ALTER TABLE users RENAME COLUMN firebase_uid TO anon_uid;
--> statement-breakpoint
ALTER INDEX users_firebase_uid_idx RENAME TO users_anon_uid_idx;
