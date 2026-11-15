# Tests

Run backend tests from `backend` with `py -3.12 -m pytest tests -q`. Run ML tests from repository root with `py -3.12 -m pytest ml/tests -q`. Run mobile type checking from `mobile` with `npx tsc --noEmit`. The API test exercises auth, consent, ownership isolation, invalid and valid uploads, unavailable models, PDF generation, deletion, and refresh rotation. Real trained model inference and physical Expo Go behavior require external artifacts and a device.
