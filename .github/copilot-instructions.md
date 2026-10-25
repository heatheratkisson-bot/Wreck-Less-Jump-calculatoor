# Copilot instructions for Wreck-Less Jump Calculator

## Repository layout

- `frontend/`: Expo + React Native app. Screens live under `frontend/app/` and are routed by Expo Router. Shared app/config logic lives in `frontend/lib/`.
- `backend/`: Python/FastAPI service. The main API and business logic live in `backend/server.py`; tests live in `backend/tests/`.
- `BUILD_APK.md` and `.github/workflows/android-apk.yml`: authoritative guidance for the Android APK build process.

## Build, test, and lint commands

### Frontend (React Native / Expo)

```bash
cd frontend
npm ci
npm start          # Expo dev server
npm run android    # open on a connected Android device/emulator
npm run web        # web preview
npm run lint       # Expo lint
npm run build:apk:cloud   # EAS cloud APK build
npm run build:apk        # local EAS APK build
```

There is no frontend Jest/Vitest test runner configured in this repo; lint is the main static validation for the app.

### Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
pytest -q
pytest tests/test_emergency.py -q
pytest tests/test_emergency.py -k "enroll_same_secret_twice_is_idempotent" -q
```

This repo's backend test suite is pytest-based and uses `httpx` ASGI transport against the FastAPI app. For a single test, use `pytest ... -k "<name>" -q` from the `backend/` directory.

### Android APK / CI build

The repo also includes a GitHub Actions workflow that validates the generated Android project and builds debug/release APKs:

```bash
cd frontend
npm ci
CI=1 npx expo prebuild --platform android --no-install
```

The workflow in `.github/workflows/android-apk.yml` is the closest thing to a full repo-level build check for the mobile app.

## High-level architecture

- The app is split between a React Native frontend and a Python API backend, with the backend responsible for payment, calculation, sharing, and emergency alert features.
- The Expo app uses file-based routing under `frontend/app/`. Screen-level composition is centralized around `app/_layout.tsx` and tab screens like `app/(tabs)/index.tsx` and `app/(tabs)/measure.tsx`.
- Shared runtime config and mobile-device persistence are centralized in `frontend/lib/appSupport.ts`. This file owns backend URL detection, device ID generation, secure storage, and offline-mode behavior. Keep new mobile app API logic aligned with this pattern instead of scattering fetch code across screens.
- The backend service in `backend/server.py` is the main API entry point. It mixes HTTP route definitions, Pydantic request/response models, MongoDB access via `motor`, and business logic for subscription management, saved calculations, emergency alerts, and shared jump data.
- The data model is intentionally app-specific: saved calculations, jump results, and emergency settings are strongly typed in the backend and mirrored in the frontend typing layer. Do not treat the API as a generic REST CRUD service; it is a domain-specific mobile app backend.

## Key conventions specific to this codebase

- Prefer extending the existing domain models in `backend/server.py` over creating ad hoc plain dictionaries for API payloads. Request/response validation is a core part of the backend contract.
- For frontend integration, prefer adding/update logic in `frontend/lib/` and reusing the existing `device_id` / secure-storage patterns instead of creating one-off local state or fetch calls in screen files.
- The app has explicit offline/back-end-optional behavior. `frontend/lib/appSupport.ts` toggles `isBackendConfigured` and `isPaywallEnabled` based on `EXPO_PUBLIC_BACKEND_URL` and `EXPO_PUBLIC_ENABLE_PAYWALL`, and the root layout falls back gracefully when the backend is unavailable.
- The emergency alert feature uses a separate `emergency_device_id` and secret token flow intentionally kept distinct from the general `device_id`. Preserve that separation; the code comments in the backend and support layer describe the security model and should be followed when editing emergency-related endpoints.
- Backend tests are written to validate API behavior without a real MongoDB deployment. Follow the `pytest` + `httpx` ASGI Transport pattern already used in `backend/tests/test_emergency.py` for new endpoint tests.
- Android packaging is a first-class concern in this repo. If a change affects native configuration, Expo routing, or mobile app setup, validate with the Expo prebuild / APK workflow rather than assuming JS-only changes are sufficient.

## Working style notes

- The app is an Expo project pinned to a specific Node version (`^22.13.0 || ^24.3.0 || >=26.0.0`) as declared in `frontend/package.json`.
- The backend is a Python project with pinned dependencies in `backend/requirements.txt`; when changing API or model behavior, keep compatibility with the existing dependency set.
- The official user-facing setup instructions live in `README.md` and `BUILD_APK.md`; keep changes in line with those workflows and don’t introduce alternate build patterns without updating the relevant docs.
