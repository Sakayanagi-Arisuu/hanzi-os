/** Explicit inventories prevent a malformed input from silently changing release scope. */
export const authoredBatches={
  hsk2MotionMeeting:{file:'thien-lo-hsk2-motion-meeting-v2',lessonIds:['hsk2-travel-leisure-lesson-02','hsk2-travel-leisure-lesson-05']},
  hsk2FamilyDirections:{file:'thien-lo-hsk2-family-directions-v2',lessonIds:['hsk2-daily-needs-family-lesson-05','hsk2-travel-leisure-lesson-01']},
  hsk2Health:{file:'thien-lo-hsk2-health-v2',lessonIds:['hsk2-daily-needs-family-lesson-04']},
  hsk2FoodShopping:{file:'thien-lo-hsk2-food-shopping-v2',lessonIds:['hsk2-daily-needs-family-lesson-02','hsk2-daily-needs-family-lesson-03']},
  bootSound:{file:'thien-lo-boot-sound-batch-v2',lessonIds:['boot-3','boot-4']},
  characters:{file:'thien-lo-character-batch-v2',lessonIds:Array.from({length:15},(_,i)=>`characters-${i+1}`)},
  journey:{file:'thien-lo-journey-batch-v2',lessonIds:['journey-1','journey-2']},
  survival:{file:'thien-lo-survival-batch-v2',lessonIds:Array.from({length:9},(_,i)=>`survival-${i+1}`)},
  everyday:{file:'thien-lo-everyday-batch-v2',lessonIds:[
    'daily-1','daily-2','daily-3','daily-4',
    'hsk1-time-place-events-01-numbers','hsk1-time-place-events-02-calendar',
    'hsk1-time-place-events-03-week-and-day-parts','hsk1-time-place-events-04-clock-and-duration',
    'hsk1-time-place-events-05-location','hsk1-time-place-events-06-weather-and-residence',
  ]},
};
