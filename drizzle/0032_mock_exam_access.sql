CREATE TABLE `mock_exam_access_rules` (
  `exam_level` text NOT NULL CHECK (`exam_level` IN ('hsk1','hsk2','hsk3','hsk4')),
  `form_key` text NOT NULL CHECK (`form_key` IN ('a','b','c','d','e','f','g','h','i','j','k','l')),
  `tier` text NOT NULL CHECK (`tier` IN ('free','premium')),
  `updated_by` text NOT NULL,
  `updated_at` integer NOT NULL,
  PRIMARY KEY (`exam_level`, `form_key`)
);
