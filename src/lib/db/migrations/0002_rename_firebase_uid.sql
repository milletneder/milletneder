-- firebase_uid sütununu anon_uid olarak yeniden adlandır
-- Veri kaybı yok, sadece sütun ve index ismi değişiyor
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='firebase_uid') THEN
    ALTER TABLE users RENAME COLUMN firebase_uid TO anon_uid;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='users_firebase_uid_idx') THEN
    ALTER INDEX users_firebase_uid_idx RENAME TO users_anon_uid_idx;
  END IF;
END $$;
