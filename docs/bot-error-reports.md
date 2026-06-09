# Bot Error Reports

Este archivo queda reservado para reportes automaticos del bot worker.

Los errores se agregan con marcadores `<!-- BOT_ERROR_REPORT_START -->` y `<!-- BOT_ERROR_REPORT_END -->`, incluyendo contexto y pasos para recrear el caso.


<!-- BOT_ERROR_REPORT_START -->
## Bot Error - 2026-05-08T22:30:48.519Z

- Bot ID: `80145202-ada3-4e61-8eda-d5cc173d3557`
- City ID: `9e9e9d59-f09e-4a07-9a92-9da276839fbe`
- Action: `TRAIN_UNITS`
- Status: `UNEXPECTED_ERROR`
- Error kind: `unexpected`
- Message: 
Invalid `model.create()` invocation in
C:\Programacion\etheria\apps\api\src\infrastructure\postgresCompat.ts:179:29

  176 
  177 async insert(collection: string, data: Record<string, any>) {
  178   const model = modelFor(collection);
→ 179   const row = await model.create({
          data: {
            id: "06a0c27b-144a-4cd6-88df-c24fd4f3541a",
            cityId: "9e9e9d59-f09e-4a07-9a92-9da276839fbe",
            unitType: "CROSSBOWMAN",
                      ~~~~~~~~~~~~~
            count: 2,
            startedAt: new Date("2026-05-08T22:30:48.502Z"),
            completesAt: new Date("2026-05-08T22:33:08.502Z"),
            isComplete: false
          }
        })

Invalid value for argument `unitType`. Expected UnitType.
- Reason: MILITARIST train CROSSBOWMAN (balance)

### How To Recreate

1. Use the same database state or restore a dump from around the timestamp above.
2. Ensure `DB_PROVIDER="postgres"` and the API is running with bots enabled.
3. Inspect bot `80145202-ada3-4e61-8eda-d5cc173d3557` and city `9e9e9d59-f09e-4a07-9a92-9da276839fbe` in Postgres.
4. Re-run the bot decision for action `TRAIN_UNITS` with the payload below.
5. If the same action fails through the HTTP route or shared action service, treat it as a gameplay/backend bug.

### Payload

```json
{
  "decision": {
    "unitType": "CROSSBOWMAN",
    "count": 2
  },
  "details": {}
}
```

### Stack

```text
PrismaClientValidationError: 
Invalid `model.create()` invocation in
C:\Programacion\etheria\apps\api\src\infrastructure\postgresCompat.ts:179:29

  176 
  177 async insert(collection: string, data: Record<string, any>) {
  178   const model = modelFor(collection);
→ 179   const row = await model.create({
          data: {
            id: "06a0c27b-144a-4cd6-88df-c24fd4f3541a",
            cityId: "9e9e9d59-f09e-4a07-9a92-9da276839fbe",
            unitType: "CROSSBOWMAN",
                      ~~~~~~~~~~~~~
            count: 2,
            startedAt: new Date("2026-05-08T22:30:48.502Z"),
            completesAt: new Date("2026-05-08T22:33:08.502Z"),
            isComplete: false
          }
        })

Invalid value for argument `unitType`. Expected UnitType.
    at throwValidationException (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\core\errorRendering\throwValidationException.ts:45:9)
    at ei.handleRequestError (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\RequestHandler.ts:202:7)
    at ei.handleAndLogRequestError (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\RequestHandler.ts:174:12)
    at ei.request (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\RequestHandler.ts:143:12)
    at async a (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\getPrismaClient.ts:833:24)
    at async Object.insert (C:\Programacion\etheria\apps\api\src\infrastructure\postgresCompat.ts:179:17)
    at async trainUnitsAction (C:\Programacion\etheria\apps\api\src\domain\cityActions.ts:347:3)
    at async processDueBots (C:\Programacion\etheria\apps\api\src\domain\botService.ts:437:22)
    at async Timeout._onTimeout (C:\Programacion\etheria\apps\api\src\workers\botWorker.ts:23:22)
```
<!-- BOT_ERROR_REPORT_END -->

<!-- BOT_ERROR_REPORT_START -->
## Bot Error - 2026-05-08T22:31:33.445Z

- Bot ID: `5e885d4d-c6c0-4227-bacb-57f3b1ef02e8`
- City ID: `bf0352f9-0416-4d85-bccc-751502ef7ce1`
- Action: `TRAIN_UNITS`
- Status: `UNEXPECTED_ERROR`
- Error kind: `unexpected`
- Message: 
Invalid `model.create()` invocation in
C:\Programacion\etheria\apps\api\src\infrastructure\postgresCompat.ts:179:29

  176 
  177 async insert(collection: string, data: Record<string, any>) {
  178   const model = modelFor(collection);
→ 179   const row = await model.create({
          data: {
            id: "6c6fbdcd-2917-43a3-a37a-158530682613",
            cityId: "bf0352f9-0416-4d85-bccc-751502ef7ce1",
            unitType: "CROSSBOWMAN",
                      ~~~~~~~~~~~~~
            count: 2,
            startedAt: new Date("2026-05-08T22:31:33.429Z"),
            completesAt: new Date("2026-05-08T22:33:53.429Z"),
            isComplete: false
          }
        })

Invalid value for argument `unitType`. Expected UnitType.
- Reason: MILITARIST train CROSSBOWMAN (balance)

### How To Recreate

1. Use the same database state or restore a dump from around the timestamp above.
2. Ensure `DB_PROVIDER="postgres"` and the API is running with bots enabled.
3. Inspect bot `5e885d4d-c6c0-4227-bacb-57f3b1ef02e8` and city `bf0352f9-0416-4d85-bccc-751502ef7ce1` in Postgres.
4. Re-run the bot decision for action `TRAIN_UNITS` with the payload below.
5. If the same action fails through the HTTP route or shared action service, treat it as a gameplay/backend bug.

### Payload

```json
{
  "decision": {
    "unitType": "CROSSBOWMAN",
    "count": 2
  },
  "details": {}
}
```

### Stack

```text
PrismaClientValidationError: 
Invalid `model.create()` invocation in
C:\Programacion\etheria\apps\api\src\infrastructure\postgresCompat.ts:179:29

  176 
  177 async insert(collection: string, data: Record<string, any>) {
  178   const model = modelFor(collection);
→ 179   const row = await model.create({
          data: {
            id: "6c6fbdcd-2917-43a3-a37a-158530682613",
            cityId: "bf0352f9-0416-4d85-bccc-751502ef7ce1",
            unitType: "CROSSBOWMAN",
                      ~~~~~~~~~~~~~
            count: 2,
            startedAt: new Date("2026-05-08T22:31:33.429Z"),
            completesAt: new Date("2026-05-08T22:33:53.429Z"),
            isComplete: false
          }
        })

Invalid value for argument `unitType`. Expected UnitType.
    at throwValidationException (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\core\errorRendering\throwValidationException.ts:45:9)
    at ei.handleRequestError (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\RequestHandler.ts:202:7)
    at ei.handleAndLogRequestError (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\RequestHandler.ts:174:12)
    at ei.request (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\RequestHandler.ts:143:12)
    at async a (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\getPrismaClient.ts:833:24)
    at async Object.insert (C:\Programacion\etheria\apps\api\src\infrastructure\postgresCompat.ts:179:17)
    at async trainUnitsAction (C:\Programacion\etheria\apps\api\src\domain\cityActions.ts:347:3)
    at async processDueBots (C:\Programacion\etheria\apps\api\src\domain\botService.ts:437:22)
    at async Timeout._onTimeout (C:\Programacion\etheria\apps\api\src\workers\botWorker.ts:23:22)
```
<!-- BOT_ERROR_REPORT_END -->

<!-- BOT_ERROR_REPORT_START -->
## Bot Error - 2026-05-10T09:42:00.326Z

- Bot ID: `80145202-ada3-4e61-8eda-d5cc173d3557`
- City ID: `9e9e9d59-f09e-4a07-9a92-9da276839fbe`
- Action: `TRAIN_UNITS`
- Status: `UNEXPECTED_ERROR`
- Error kind: `unexpected`
- Message: 
Invalid `model.create()` invocation in
C:\Programacion\etheria\apps\api\src\infrastructure\postgresCompat.ts:179:29

  176 
  177 async insert(collection: string, data: Record<string, any>) {
  178   const model = modelFor(collection);
→ 179   const row = await model.create({
          data: {
            id: "bf6113ae-1d0b-4dbb-9b11-df4a17a34af5",
            cityId: "9e9e9d59-f09e-4a07-9a92-9da276839fbe",
            unitType: "CROSSBOWMAN",
                      ~~~~~~~~~~~~~
            count: 10,
            startedAt: new Date("2026-05-10T09:42:00.290Z"),
            completesAt: new Date("2026-05-10T09:53:40.290Z"),
            isComplete: false
          }
        })

Invalid value for argument `unitType`. Expected UnitType.
- Reason: MILITARIST train CROSSBOWMAN (balance)

### How To Recreate

1. Use the same database state or restore a dump from around the timestamp above.
2. Ensure `DB_PROVIDER="postgres"` and the API is running with bots enabled.
3. Inspect bot `80145202-ada3-4e61-8eda-d5cc173d3557` and city `9e9e9d59-f09e-4a07-9a92-9da276839fbe` in Postgres.
4. Re-run the bot decision for action `TRAIN_UNITS` with the payload below.
5. If the same action fails through the HTTP route or shared action service, treat it as a gameplay/backend bug.

### Payload

```json
{
  "decision": {
    "unitType": "CROSSBOWMAN",
    "count": 10
  },
  "details": {}
}
```

### Stack

```text
PrismaClientValidationError: 
Invalid `model.create()` invocation in
C:\Programacion\etheria\apps\api\src\infrastructure\postgresCompat.ts:179:29

  176 
  177 async insert(collection: string, data: Record<string, any>) {
  178   const model = modelFor(collection);
→ 179   const row = await model.create({
          data: {
            id: "bf6113ae-1d0b-4dbb-9b11-df4a17a34af5",
            cityId: "9e9e9d59-f09e-4a07-9a92-9da276839fbe",
            unitType: "CROSSBOWMAN",
                      ~~~~~~~~~~~~~
            count: 10,
            startedAt: new Date("2026-05-10T09:42:00.290Z"),
            completesAt: new Date("2026-05-10T09:53:40.290Z"),
            isComplete: false
          }
        })

Invalid value for argument `unitType`. Expected UnitType.
    at throwValidationException (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\core\errorRendering\throwValidationException.ts:45:9)
    at ei.handleRequestError (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\RequestHandler.ts:202:7)
    at ei.handleAndLogRequestError (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\RequestHandler.ts:174:12)
    at ei.request (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\RequestHandler.ts:143:12)
    at async a (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\getPrismaClient.ts:833:24)
    at async Object.insert (C:\Programacion\etheria\apps\api\src\infrastructure\postgresCompat.ts:179:17)
    at async trainUnitsAction (C:\Programacion\etheria\apps\api\src\domain\cityActions.ts:347:3)
    at async processDueBots (C:\Programacion\etheria\apps\api\src\domain\botService.ts:437:22)
    at async Timeout._onTimeout (C:\Programacion\etheria\apps\api\src\workers\botWorker.ts:23:22)
```
<!-- BOT_ERROR_REPORT_END -->

<!-- BOT_ERROR_REPORT_START -->
## Bot Error - 2026-05-10T09:42:45.402Z

- Bot ID: `5e885d4d-c6c0-4227-bacb-57f3b1ef02e8`
- City ID: `bf0352f9-0416-4d85-bccc-751502ef7ce1`
- Action: `TRAIN_UNITS`
- Status: `UNEXPECTED_ERROR`
- Error kind: `unexpected`
- Message: 
Invalid `model.create()` invocation in
C:\Programacion\etheria\apps\api\src\infrastructure\postgresCompat.ts:179:29

  176 
  177 async insert(collection: string, data: Record<string, any>) {
  178   const model = modelFor(collection);
→ 179   const row = await model.create({
          data: {
            id: "4b7b8018-f6c1-4880-9830-f8aad62e9f2e",
            cityId: "bf0352f9-0416-4d85-bccc-751502ef7ce1",
            unitType: "CROSSBOWMAN",
                      ~~~~~~~~~~~~~
            count: 10,
            startedAt: new Date("2026-05-10T09:42:45.375Z"),
            completesAt: new Date("2026-05-10T09:54:25.375Z"),
            isComplete: false
          }
        })

Invalid value for argument `unitType`. Expected UnitType.
- Reason: MILITARIST train CROSSBOWMAN (balance)

### How To Recreate

1. Use the same database state or restore a dump from around the timestamp above.
2. Ensure `DB_PROVIDER="postgres"` and the API is running with bots enabled.
3. Inspect bot `5e885d4d-c6c0-4227-bacb-57f3b1ef02e8` and city `bf0352f9-0416-4d85-bccc-751502ef7ce1` in Postgres.
4. Re-run the bot decision for action `TRAIN_UNITS` with the payload below.
5. If the same action fails through the HTTP route or shared action service, treat it as a gameplay/backend bug.

### Payload

```json
{
  "decision": {
    "unitType": "CROSSBOWMAN",
    "count": 10
  },
  "details": {}
}
```

### Stack

```text
PrismaClientValidationError: 
Invalid `model.create()` invocation in
C:\Programacion\etheria\apps\api\src\infrastructure\postgresCompat.ts:179:29

  176 
  177 async insert(collection: string, data: Record<string, any>) {
  178   const model = modelFor(collection);
→ 179   const row = await model.create({
          data: {
            id: "4b7b8018-f6c1-4880-9830-f8aad62e9f2e",
            cityId: "bf0352f9-0416-4d85-bccc-751502ef7ce1",
            unitType: "CROSSBOWMAN",
                      ~~~~~~~~~~~~~
            count: 10,
            startedAt: new Date("2026-05-10T09:42:45.375Z"),
            completesAt: new Date("2026-05-10T09:54:25.375Z"),
            isComplete: false
          }
        })

Invalid value for argument `unitType`. Expected UnitType.
    at throwValidationException (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\core\errorRendering\throwValidationException.ts:45:9)
    at ei.handleRequestError (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\RequestHandler.ts:202:7)
    at ei.handleAndLogRequestError (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\RequestHandler.ts:174:12)
    at ei.request (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\RequestHandler.ts:143:12)
    at async a (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\getPrismaClient.ts:833:24)
    at async Object.insert (C:\Programacion\etheria\apps\api\src\infrastructure\postgresCompat.ts:179:17)
    at async trainUnitsAction (C:\Programacion\etheria\apps\api\src\domain\cityActions.ts:347:3)
    at async processDueBots (C:\Programacion\etheria\apps\api\src\domain\botService.ts:437:22)
    at async Timeout._onTimeout (C:\Programacion\etheria\apps\api\src\workers\botWorker.ts:23:22)
```
<!-- BOT_ERROR_REPORT_END -->

<!-- BOT_ERROR_REPORT_START -->
## Bot Error - 2026-05-10T09:58:30.433Z

- Bot ID: `80145202-ada3-4e61-8eda-d5cc173d3557`
- City ID: `9e9e9d59-f09e-4a07-9a92-9da276839fbe`
- Action: `TRAIN_UNITS`
- Status: `UNEXPECTED_ERROR`
- Error kind: `unexpected`
- Message: 
Invalid `model.create()` invocation in
C:\Programacion\etheria\apps\api\src\infrastructure\postgresCompat.ts:179:29

  176 
  177 async insert(collection: string, data: Record<string, any>) {
  178   const model = modelFor(collection);
→ 179   const row = await model.create({
          data: {
            id: "aa942e8d-a19e-4fea-ab65-ad538af2d749",
            cityId: "9e9e9d59-f09e-4a07-9a92-9da276839fbe",
            unitType: "CROSSBOWMAN",
                      ~~~~~~~~~~~~~
            count: 10,
            startedAt: new Date("2026-05-10T09:58:30.404Z"),
            completesAt: new Date("2026-05-10T10:10:10.404Z"),
            isComplete: false
          }
        })

Invalid value for argument `unitType`. Expected UnitType.
- Reason: MILITARIST train CROSSBOWMAN (balance)

### How To Recreate

1. Use the same database state or restore a dump from around the timestamp above.
2. Ensure `DB_PROVIDER="postgres"` and the API is running with bots enabled.
3. Inspect bot `80145202-ada3-4e61-8eda-d5cc173d3557` and city `9e9e9d59-f09e-4a07-9a92-9da276839fbe` in Postgres.
4. Re-run the bot decision for action `TRAIN_UNITS` with the payload below.
5. If the same action fails through the HTTP route or shared action service, treat it as a gameplay/backend bug.

### Payload

```json
{
  "decision": {
    "unitType": "CROSSBOWMAN",
    "count": 10
  },
  "details": {}
}
```

### Stack

```text
PrismaClientValidationError: 
Invalid `model.create()` invocation in
C:\Programacion\etheria\apps\api\src\infrastructure\postgresCompat.ts:179:29

  176 
  177 async insert(collection: string, data: Record<string, any>) {
  178   const model = modelFor(collection);
→ 179   const row = await model.create({
          data: {
            id: "aa942e8d-a19e-4fea-ab65-ad538af2d749",
            cityId: "9e9e9d59-f09e-4a07-9a92-9da276839fbe",
            unitType: "CROSSBOWMAN",
                      ~~~~~~~~~~~~~
            count: 10,
            startedAt: new Date("2026-05-10T09:58:30.404Z"),
            completesAt: new Date("2026-05-10T10:10:10.404Z"),
            isComplete: false
          }
        })

Invalid value for argument `unitType`. Expected UnitType.
    at throwValidationException (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\core\errorRendering\throwValidationException.ts:45:9)
    at ei.handleRequestError (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\RequestHandler.ts:202:7)
    at ei.handleAndLogRequestError (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\RequestHandler.ts:174:12)
    at ei.request (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\RequestHandler.ts:143:12)
    at async a (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\getPrismaClient.ts:833:24)
    at async Object.insert (C:\Programacion\etheria\apps\api\src\infrastructure\postgresCompat.ts:179:17)
    at async trainUnitsAction (C:\Programacion\etheria\apps\api\src\domain\cityActions.ts:347:3)
    at async processDueBots (C:\Programacion\etheria\apps\api\src\domain\botService.ts:437:22)
    at async Timeout._onTimeout (C:\Programacion\etheria\apps\api\src\workers\botWorker.ts:23:22)
```
<!-- BOT_ERROR_REPORT_END -->

<!-- BOT_ERROR_REPORT_START -->
## Bot Error - 2026-05-10T09:59:15.418Z

- Bot ID: `5e885d4d-c6c0-4227-bacb-57f3b1ef02e8`
- City ID: `bf0352f9-0416-4d85-bccc-751502ef7ce1`
- Action: `TRAIN_UNITS`
- Status: `UNEXPECTED_ERROR`
- Error kind: `unexpected`
- Message: 
Invalid `model.create()` invocation in
C:\Programacion\etheria\apps\api\src\infrastructure\postgresCompat.ts:179:29

  176 
  177 async insert(collection: string, data: Record<string, any>) {
  178   const model = modelFor(collection);
→ 179   const row = await model.create({
          data: {
            id: "f7104f68-7a31-4962-902c-c6952599013c",
            cityId: "bf0352f9-0416-4d85-bccc-751502ef7ce1",
            unitType: "CROSSBOWMAN",
                      ~~~~~~~~~~~~~
            count: 10,
            startedAt: new Date("2026-05-10T09:59:15.405Z"),
            completesAt: new Date("2026-05-10T10:10:55.405Z"),
            isComplete: false
          }
        })

Invalid value for argument `unitType`. Expected UnitType.
- Reason: MILITARIST train CROSSBOWMAN (balance)

### How To Recreate

1. Use the same database state or restore a dump from around the timestamp above.
2. Ensure `DB_PROVIDER="postgres"` and the API is running with bots enabled.
3. Inspect bot `5e885d4d-c6c0-4227-bacb-57f3b1ef02e8` and city `bf0352f9-0416-4d85-bccc-751502ef7ce1` in Postgres.
4. Re-run the bot decision for action `TRAIN_UNITS` with the payload below.
5. If the same action fails through the HTTP route or shared action service, treat it as a gameplay/backend bug.

### Payload

```json
{
  "decision": {
    "unitType": "CROSSBOWMAN",
    "count": 10
  },
  "details": {}
}
```

### Stack

```text
PrismaClientValidationError: 
Invalid `model.create()` invocation in
C:\Programacion\etheria\apps\api\src\infrastructure\postgresCompat.ts:179:29

  176 
  177 async insert(collection: string, data: Record<string, any>) {
  178   const model = modelFor(collection);
→ 179   const row = await model.create({
          data: {
            id: "f7104f68-7a31-4962-902c-c6952599013c",
            cityId: "bf0352f9-0416-4d85-bccc-751502ef7ce1",
            unitType: "CROSSBOWMAN",
                      ~~~~~~~~~~~~~
            count: 10,
            startedAt: new Date("2026-05-10T09:59:15.405Z"),
            completesAt: new Date("2026-05-10T10:10:55.405Z"),
            isComplete: false
          }
        })

Invalid value for argument `unitType`. Expected UnitType.
    at throwValidationException (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\core\errorRendering\throwValidationException.ts:45:9)
    at ei.handleRequestError (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\RequestHandler.ts:202:7)
    at ei.handleAndLogRequestError (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\RequestHandler.ts:174:12)
    at ei.request (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\RequestHandler.ts:143:12)
    at async a (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\getPrismaClient.ts:833:24)
    at async Object.insert (C:\Programacion\etheria\apps\api\src\infrastructure\postgresCompat.ts:179:17)
    at async trainUnitsAction (C:\Programacion\etheria\apps\api\src\domain\cityActions.ts:347:3)
    at async processDueBots (C:\Programacion\etheria\apps\api\src\domain\botService.ts:437:22)
    at async Timeout._onTimeout (C:\Programacion\etheria\apps\api\src\workers\botWorker.ts:23:22)
```
<!-- BOT_ERROR_REPORT_END -->

<!-- BOT_ERROR_REPORT_START -->
## Bot Error - 2026-05-10T10:15:45.614Z

- Bot ID: `5e885d4d-c6c0-4227-bacb-57f3b1ef02e8`
- City ID: `bf0352f9-0416-4d85-bccc-751502ef7ce1`
- Action: `TRAIN_UNITS`
- Status: `UNEXPECTED_ERROR`
- Error kind: `unexpected`
- Message: 
Invalid `model.create()` invocation in
C:\Programacion\etheria\apps\api\src\infrastructure\postgresCompat.ts:179:29

  176 
  177 async insert(collection: string, data: Record<string, any>) {
  178   const model = modelFor(collection);
→ 179   const row = await model.create({
          data: {
            id: "af27aff2-6f1c-4abd-9fcf-27201aa57079",
            cityId: "bf0352f9-0416-4d85-bccc-751502ef7ce1",
            unitType: "CROSSBOWMAN",
                      ~~~~~~~~~~~~~
            count: 10,
            startedAt: new Date("2026-05-10T10:15:45.596Z"),
            completesAt: new Date("2026-05-10T10:27:25.596Z"),
            isComplete: false
          }
        })

Invalid value for argument `unitType`. Expected UnitType.
- Reason: MILITARIST train CROSSBOWMAN (balance)

### How To Recreate

1. Use the same database state or restore a dump from around the timestamp above.
2. Ensure `DB_PROVIDER="postgres"` and the API is running with bots enabled.
3. Inspect bot `5e885d4d-c6c0-4227-bacb-57f3b1ef02e8` and city `bf0352f9-0416-4d85-bccc-751502ef7ce1` in Postgres.
4. Re-run the bot decision for action `TRAIN_UNITS` with the payload below.
5. If the same action fails through the HTTP route or shared action service, treat it as a gameplay/backend bug.

### Payload

```json
{
  "decision": {
    "unitType": "CROSSBOWMAN",
    "count": 10
  },
  "details": {}
}
```

### Stack

```text
PrismaClientValidationError: 
Invalid `model.create()` invocation in
C:\Programacion\etheria\apps\api\src\infrastructure\postgresCompat.ts:179:29

  176 
  177 async insert(collection: string, data: Record<string, any>) {
  178   const model = modelFor(collection);
→ 179   const row = await model.create({
          data: {
            id: "af27aff2-6f1c-4abd-9fcf-27201aa57079",
            cityId: "bf0352f9-0416-4d85-bccc-751502ef7ce1",
            unitType: "CROSSBOWMAN",
                      ~~~~~~~~~~~~~
            count: 10,
            startedAt: new Date("2026-05-10T10:15:45.596Z"),
            completesAt: new Date("2026-05-10T10:27:25.596Z"),
            isComplete: false
          }
        })

Invalid value for argument `unitType`. Expected UnitType.
    at throwValidationException (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\core\errorRendering\throwValidationException.ts:45:9)
    at ei.handleRequestError (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\RequestHandler.ts:202:7)
    at ei.handleAndLogRequestError (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\RequestHandler.ts:174:12)
    at ei.request (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\RequestHandler.ts:143:12)
    at async a (C:\Programacion\etheria\node_modules\.pnpm\@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e\node_modules\@prisma\client\src\runtime\getPrismaClient.ts:833:24)
    at async Object.insert (C:\Programacion\etheria\apps\api\src\infrastructure\postgresCompat.ts:179:17)
    at async trainUnitsAction (C:\Programacion\etheria\apps\api\src\domain\cityActions.ts:347:3)
    at async processDueBots (C:\Programacion\etheria\apps\api\src\domain\botService.ts:437:22)
    at async Timeout._onTimeout (C:\Programacion\etheria\apps\api\src\workers\botWorker.ts:23:22)
```
<!-- BOT_ERROR_REPORT_END -->

<!-- BOT_ERROR_REPORT_START -->
## Bot Error - 2026-06-09T12:08:55.152Z

- Bot ID: `d43625d1-e589-431c-a7a5-bfd82caa8e30`
- City ID: `5799eed9-b39f-413c-a511-c6f094da8388`
- Action: `TRAIN_UNITS`
- Status: `UNEXPECTED_ERROR`
- Error kind: `unexpected`
- Message: 
Invalid `model.create()` invocation in
/home/sexs/programacion/etheria/apps/api/src/infrastructure/postgresCompat.ts:180:29

  177 
  178 async insert(collection: string, data: Record<string, any>) {
  179   const model = modelFor(collection);
→ 180   const row = await model.create({
          data: {
            id: "494928c9-d7f5-4282-a7c9-021dbc7d154f",
            cityId: "5799eed9-b39f-413c-a511-c6f094da8388",
            unitType: "PIKEMAN",
                      ~~~~~~~~~
            count: 10,
            startedAt: new Date("2026-06-09T12:08:55.136Z"),
            completesAt: new Date("2026-06-09T12:17:15.136Z"),
            isComplete: false
          }
        })

Invalid value for argument `unitType`. Expected UnitType.
- Reason: MILITARIST train PIKEMAN (balance)

### How To Recreate

1. Use the same database state or restore a dump from around the timestamp above.
2. Ensure `DB_PROVIDER="postgres"` and the API is running with bots enabled.
3. Inspect bot `d43625d1-e589-431c-a7a5-bfd82caa8e30` and city `5799eed9-b39f-413c-a511-c6f094da8388` in Postgres.
4. Re-run the bot decision for action `TRAIN_UNITS` with the payload below.
5. If the same action fails through the HTTP route or shared action service, treat it as a gameplay/backend bug.

### Payload

```json
{
  "decision": {
    "unitType": "PIKEMAN",
    "count": 10
  },
  "details": {}
}
```

### Stack

```text
PrismaClientValidationError: 
Invalid `model.create()` invocation in
/home/sexs/programacion/etheria/apps/api/src/infrastructure/postgresCompat.ts:180:29

  177 
  178 async insert(collection: string, data: Record<string, any>) {
  179   const model = modelFor(collection);
→ 180   const row = await model.create({
          data: {
            id: "494928c9-d7f5-4282-a7c9-021dbc7d154f",
            cityId: "5799eed9-b39f-413c-a511-c6f094da8388",
            unitType: "PIKEMAN",
                      ~~~~~~~~~
            count: 10,
            startedAt: new Date("2026-06-09T12:08:55.136Z"),
            completesAt: new Date("2026-06-09T12:17:15.136Z"),
            isComplete: false
          }
        })

Invalid value for argument `unitType`. Expected UnitType.
    at throwValidationException (/home/sexs/programacion/etheria/node_modules/.pnpm/@prisma+client@6.19.3_prisma@6.19.3_typescript@5.9.3__typescript@5.9.3/node_modules/@prisma/client/src/runtime/core/errorRendering/throwValidationException.ts:45:9)
    at ei.handleRequestError (/home/sexs/programacion/etheria/node_modules/.pnpm/@prisma+client@6.19.3_prisma@6.19.3_typescript@5.9.3__typescript@5.9.3/node_modules/@prisma/client/src/runtime/RequestHandler.ts:202:7)
    at ei.handleAndLogRequestError (/home/sexs/programacion/etheria/node_modules/.pnpm/@prisma+client@6.19.3_prisma@6.19.3_typescript@5.9.3__typescript@5.9.3/node_modules/@prisma/client/src/runtime/RequestHandler.ts:174:12)
    at ei.request (/home/sexs/programacion/etheria/node_modules/.pnpm/@prisma+client@6.19.3_prisma@6.19.3_typescript@5.9.3__typescript@5.9.3/node_modules/@prisma/client/src/runtime/RequestHandler.ts:143:12)
    at async a (/home/sexs/programacion/etheria/node_modules/.pnpm/@prisma+client@6.19.3_prisma@6.19.3_typescript@5.9.3__typescript@5.9.3/node_modules/@prisma/client/src/runtime/getPrismaClient.ts:833:24)
    at async Object.insert (/home/sexs/programacion/etheria/apps/api/src/infrastructure/postgresCompat.ts:180:17)
    at async trainUnitsAction (/home/sexs/programacion/etheria/apps/api/src/domain/cityActions.ts:353:3)
    at async processDueBots (/home/sexs/programacion/etheria/apps/api/src/domain/botService.ts:461:22)
    at async processBotWorkerTick (/home/sexs/programacion/etheria/apps/api/src/workers/botWorker.ts:42:20)
    at async Timeout._onTimeout (/home/sexs/programacion/etheria/apps/api/src/workers/botWorker.ts:24:7)
```
<!-- BOT_ERROR_REPORT_END -->

<!-- BOT_ERROR_REPORT_START -->
## Bot Error - 2026-06-09T12:09:40.117Z

- Bot ID: `f2b0e4b6-2fe2-4755-8b06-7a6e0c93e6af`
- City ID: `79b292ce-d965-47d3-91c4-59607db76f3e`
- Action: `TRAIN_UNITS`
- Status: `UNEXPECTED_ERROR`
- Error kind: `unexpected`
- Message: 
Invalid `model.create()` invocation in
/home/sexs/programacion/etheria/apps/api/src/infrastructure/postgresCompat.ts:180:29

  177 
  178 async insert(collection: string, data: Record<string, any>) {
  179   const model = modelFor(collection);
→ 180   const row = await model.create({
          data: {
            id: "d16d792d-9847-4173-8c8d-9f54130da6e2",
            cityId: "79b292ce-d965-47d3-91c4-59607db76f3e",
            unitType: "PIKEMAN",
                      ~~~~~~~~~
            count: 10,
            startedAt: new Date("2026-06-09T12:09:40.109Z"),
            completesAt: new Date("2026-06-09T12:18:00.109Z"),
            isComplete: false
          }
        })

Invalid value for argument `unitType`. Expected UnitType.
- Reason: MILITARIST train PIKEMAN (balance)

### How To Recreate

1. Use the same database state or restore a dump from around the timestamp above.
2. Ensure `DB_PROVIDER="postgres"` and the API is running with bots enabled.
3. Inspect bot `f2b0e4b6-2fe2-4755-8b06-7a6e0c93e6af` and city `79b292ce-d965-47d3-91c4-59607db76f3e` in Postgres.
4. Re-run the bot decision for action `TRAIN_UNITS` with the payload below.
5. If the same action fails through the HTTP route or shared action service, treat it as a gameplay/backend bug.

### Payload

```json
{
  "decision": {
    "unitType": "PIKEMAN",
    "count": 10
  },
  "details": {}
}
```

### Stack

```text
PrismaClientValidationError: 
Invalid `model.create()` invocation in
/home/sexs/programacion/etheria/apps/api/src/infrastructure/postgresCompat.ts:180:29

  177 
  178 async insert(collection: string, data: Record<string, any>) {
  179   const model = modelFor(collection);
→ 180   const row = await model.create({
          data: {
            id: "d16d792d-9847-4173-8c8d-9f54130da6e2",
            cityId: "79b292ce-d965-47d3-91c4-59607db76f3e",
            unitType: "PIKEMAN",
                      ~~~~~~~~~
            count: 10,
            startedAt: new Date("2026-06-09T12:09:40.109Z"),
            completesAt: new Date("2026-06-09T12:18:00.109Z"),
            isComplete: false
          }
        })

Invalid value for argument `unitType`. Expected UnitType.
    at throwValidationException (/home/sexs/programacion/etheria/node_modules/.pnpm/@prisma+client@6.19.3_prisma@6.19.3_typescript@5.9.3__typescript@5.9.3/node_modules/@prisma/client/src/runtime/core/errorRendering/throwValidationException.ts:45:9)
    at ei.handleRequestError (/home/sexs/programacion/etheria/node_modules/.pnpm/@prisma+client@6.19.3_prisma@6.19.3_typescript@5.9.3__typescript@5.9.3/node_modules/@prisma/client/src/runtime/RequestHandler.ts:202:7)
    at ei.handleAndLogRequestError (/home/sexs/programacion/etheria/node_modules/.pnpm/@prisma+client@6.19.3_prisma@6.19.3_typescript@5.9.3__typescript@5.9.3/node_modules/@prisma/client/src/runtime/RequestHandler.ts:174:12)
    at ei.request (/home/sexs/programacion/etheria/node_modules/.pnpm/@prisma+client@6.19.3_prisma@6.19.3_typescript@5.9.3__typescript@5.9.3/node_modules/@prisma/client/src/runtime/RequestHandler.ts:143:12)
    at async a (/home/sexs/programacion/etheria/node_modules/.pnpm/@prisma+client@6.19.3_prisma@6.19.3_typescript@5.9.3__typescript@5.9.3/node_modules/@prisma/client/src/runtime/getPrismaClient.ts:833:24)
    at async Object.insert (/home/sexs/programacion/etheria/apps/api/src/infrastructure/postgresCompat.ts:180:17)
    at async trainUnitsAction (/home/sexs/programacion/etheria/apps/api/src/domain/cityActions.ts:353:3)
    at async processDueBots (/home/sexs/programacion/etheria/apps/api/src/domain/botService.ts:461:22)
    at async processBotWorkerTick (/home/sexs/programacion/etheria/apps/api/src/workers/botWorker.ts:42:20)
    at async Timeout._onTimeout (/home/sexs/programacion/etheria/apps/api/src/workers/botWorker.ts:24:7)
```
<!-- BOT_ERROR_REPORT_END -->
