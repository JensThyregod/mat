# Mat Tutor Playwright Test Suite

Automated E2E testing for the Mat Tutor task generator system. This test suite validates all 22 task generators through the Test Lab UI.

## 🚀 Quick Start

```bash
# Navigate to playwright folder
cd playwright

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Run all tests (starts dev server automatically)
npm test
```

## 📁 Project Structure

```
playwright/
├── lib/                      # Shared utilities
│   ├── auth.ts              # Authentication helpers
│   ├── types.ts             # Type definitions
│   ├── reporting.ts         # Report generation
│   ├── pages/
│   │   └── TestLabPage.ts   # Page Object Model for Test Lab
│   └── index.ts             # Main exports
├── tests/
│   ├── fixtures.ts          # Test fixtures
│   ├── auth.spec.ts         # Authentication tests
│   └── generators/
│       ├── single-generator.spec.ts  # Test a single generator
│       ├── quick-check.spec.ts       # Fast validation of all generators
│       ├── by-category.spec.ts       # Tests grouped by category
│       └── validate-all.spec.ts      # Full validation suite
├── reports/                  # Generated reports
├── screenshots/             # Failure screenshots
├── test-results/            # Test artifacts
├── playwright.config.ts     # Playwright configuration
└── package.json
```

## 🧪 Available Scripts

| Script | Description |
|--------|-------------|
| `npm test` | Run all tests |
| `npm run test:ui` | Open Playwright UI mode |
| `npm run test:headed` | Run tests in headed browser |
| `npm run test:debug` | Debug mode with step-by-step |
| `npm run test:generators` | Run only generator tests |
| `npm run test:single` | Test a single generator type |
| `npm run validate:all` | Full validation with report |
| `npm run report` | View HTML test report |

## 🎯 Testing Specific Generators

### Test a Single Generator

Edit `tests/generators/single-generator.spec.ts`:

```typescript
const TASK_TYPE_TO_TEST = 'tal_pris_rabat_procent'; // Change this
const ITERATIONS = 5;
```

Then run:
```bash
npm run test:single
```

### Test by Category

```bash
# Run category-specific tests
npx playwright test tests/generators/by-category.spec.ts --grep "Algebra"
npx playwright test tests/generators/by-category.spec.ts --grep "Geometri"
npx playwright test tests/generators/by-category.spec.ts --grep "Statistik"
```

## 📊 Task Type IDs

### Tal og Algebra (1-10)
| # | ID | Name |
|---|-----|------|
| 1 | tal_pris_rabat_procent | Hverdagsregning |
| 2 | tal_forholdstalsregning | Proportionalitet |
| 3 | tal_hastighed_tid | Hastighed & tid |
| 4 | tal_broeker_og_antal | Brøker & procent |
| 5 | tal_regnearter | Regnearter |
| 6 | tal_regnehierarki | Regnehierarki |
| 7 | tal_ligninger | Ligninger |
| 8 | tal_overslag | Overslag |
| 9 | tal_algebraiske_udtryk | Algebra |
| 10 | tal_lineaere_funktioner | Funktioner |

### Geometri og Måling (11-18)
| # | ID | Name |
|---|-----|------|
| 11 | geo_enhedsomregning | Enheder |
| 12 | geo_trekant_elementer | Trekanter |
| 13 | geo_ligedannethed | Målestok |
| 14 | geo_sammensat_figur | Areal |
| 15 | geo_rumfang | Rumfang |
| 16 | geo_vinkelsum | Vinkler |
| 17 | geo_transformationer | Transformationer |
| 18 | geo_projektioner | 3D-figurer |

### Statistik og Sandsynlighed (19-22)
| # | ID | Name |
|---|-----|------|
| 19 | stat_soejlediagram | Diagrammer |
| 20 | stat_statistiske_maal | Statistik |
| 21 | stat_boksplot | Boksplot |
| 22 | stat_sandsynlighed | Sandsynlighed |

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_URL` | App base URL | `http://localhost:5173` |
| `CI` | CI mode (stricter) | - |

### Skip AI-Powered Tests

In `validate-all.spec.ts`:
```typescript
const SKIP_AI_TYPES = true; // Skip AI generators for faster tests
```

## 📈 Understanding Results

### Test Statuses

- ✅ **Success**: All iterations passed
- ⚠️ **Partial**: Some iterations passed
- ❌ **Failed**: All iterations failed
- ⏭️ **Skipped**: Not tested (disabled or AI-powered)

### Reports

After running `npm run validate:all`:

- `reports/validation-results.json` - Detailed JSON report
- `reports/html/` - Interactive HTML report

View the HTML report:
```bash
npm run report
```

## 🐛 Debugging

### Run in Debug Mode
```bash
npm run test:debug
```

### Take Screenshots
The TestLabPage has a `screenshot()` method:
```typescript
await testLabPage.screenshot('my-screenshot');
```

### View Traces
Failed tests automatically capture traces. View them:
```bash
npx playwright show-trace test-results/path/to/trace.zip
```

## 💡 Tips for AI Assistant

When using this test suite, you can:

1. **Validate a new generator**: Add the ID to `TASK_TYPES` in `lib/types.ts` and run `npm run test:single`

2. **Check all generators after changes**: Run `npm run validate:all`

3. **Debug a failing generator**: 
   - Set `TASK_TYPE_TO_TEST` to the failing ID
   - Run `npm run test:debug`
   - Step through the generation process

4. **Compare generation quality**: 
   - Increase `ITERATIONS` in `single-generator.spec.ts`
   - Check the console output for variation in generated content

5. **Check for regressions**: Run `npm test` after any generator changes

