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
