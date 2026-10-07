# Echolytix Hand Sign Gesture Automation Test Framework

Automated end-to-end UI testing framework built with **Selenium Java**, **TestNG**, **WebDriverManager**, and the **Page Object Model (POM)** pattern for the **Hand Sign Gesture** assistive communication feature in `D:\miniproject`.

---

## 📁 Project Structure

```
d:\testing
├── pom.xml                                      # Maven build file with Selenium, TestNG & WebDriverManager
├── testng.xml                                   # TestNG suite configuration
├── run-tests.bat                                # Windows 1-click test runner script
├── src
│   ├── main
│   │   └── java
│   │       └── com/echolytix
│   │           ├── config
│   │           │   └── ConfigReader.java        # Loads config.properties & environment properties
│   │           ├── driver
│   │           │   └── DriverManager.java       # ThreadLocal WebDriver manager with camera permissions
│   │           └── pages
│   │               ├── BasePage.java            # Reusable Selenium interaction & wait methods
│   │               ├── LoginPage.java           # Login page / AuthPortal elements and actions
│   │               ├── DashboardPage.java       # Dashboard navigation to Hand Sign feature
│   │               └── HandSignGesturePage.java # Complete Page Object for Hand Sign Gesture feature
│   └── test
│       ├── java
│       │   └── com/echolytix
│       │       ├── base
│       │       │   └── BaseTest.java            # Driver lifecycle and auth navigation helpers
│       │       └── tests
│       │           └── HandSignGestureTest.java # 10 TestNG test cases for Hand Sign Gesture
│       └── resources
│           └── config.properties                # App URL, browser, timeout & demo credentials
└── README.md
```

---

## ⚙️ Prerequisites

1. **Target Web Application Running**:
   Open a terminal in `D:\miniproject` and start the server:
   ```cmd
   cd D:\miniproject
   npm run dev
   ```
   *(Default URL: `http://localhost:3000`)*

2. **Java JDK**:
   Java 17 or higher (Eclipse Adoptium / Oracle JDK / OpenJDK).

3. **Google Chrome** or **Microsoft Edge**:
   Installed on your machine. *WebDriverManager automatically manages the driver binaries.*

---

## 🚀 Running on IntelliJ IDEA

1. Launch **IntelliJ IDEA**.
2. Click **File** > **Open...** and select the folder **`D:\testing`**.
3. IntelliJ will detect `pom.xml` and automatically load it as a Maven project.
4. If prompted to configure Project SDK:
   - Go to **File** > **Project Structure** > **Project**.
   - Set **SDK** to your installed JDK (e.g. Eclipse Adoptium 17 or Java 25).
5. **Run the Tests**:
   - **Option A (Whole Suite)**: Right-click `testng.xml` in the project explorer > click **Run '...\testng.xml'**.
   - **Option B (Test Class)**: Navigate to `src/test/java/com/echolytix/tests/HandSignGestureTest.java`, right-click inside the file > click **Run 'HandSignGestureTest'**.
   - **Option C (Individual Test)**: Click the green **Run (▶)** icon next to any individual `@Test` method.

---

## 🌓 Running on Eclipse IDE

1. Launch **Eclipse IDE**.
2. Click **File** > **Import...** > **Maven** > **Existing Maven Projects**.
3. Browse to **`D:\testing`** and click **Finish**.
4. Allow Eclipse to import and build the workspace.
5. If you haven't installed the TestNG plugin in Eclipse:
   - Go to **Help** > **Eclipse Marketplace...** > search for **TestNG** > click **Install**.
6. **Run the Tests**:
   - **Option A**: Right-click `testng.xml` > **Run As** > **TestNG Suite**.
   - **Option B**: Right-click `HandSignGestureTest.java` > **Run As** > **TestNG Test**.
   - **Option C**: Right-click the project `echolytix-selenium-tests` > **Run As** > **Maven test**.

---

## 💻 Running from Command Line

You can run the entire suite using either the batch script or Maven:

- **Using the batch script**:
  Double-click `run-tests.bat` or run in terminal:
  ```cmd
  D:\testing\run-tests.bat
  ```

- **Using Maven**:
  ```cmd
  mvn clean test
  ```

---

## 🧪 Test Case Coverage Matrix

| # | Test Method | Description |
|---|---|---|
| 1 | `testNavigateToHandSignFeature` | Verifies authorization and routing to Hand Sign Gesture page. |
| 2 | `testHandSignPageElementsPresent` | Verifies presence of HUD metrics (Confidence, FPS), finger signals (Thumb, Index, Middle, Ring, Pinky), and initial state (`None`). |
| 3 | `testSingleGestureSelectionUpdatesState` | Clicks `HELLO` on cheat sheet; verifies gesture name, 98.5% confidence, and phrase update. |
| 4 | `testMultiGesturePhraseConstruction` | Appends `HELLO`, `HELP`, `NEED WATER` sequentially; verifies sentence concatenation with spaces. |
| 5 | `testDeleteWordFunctionality` | Verifies "Delete Word" removes the last appended gesture while preserving prior words. |
| 6 | `testClearAllPhraseAndState` | Verifies "Clear All" clears constructed phrases and reverts to placeholder state. |
| 7 | `testSkeletonOverlayToggle` | Verifies toggling the Skeleton Overlay HUD checkbox on and off. |
| 8 | `testVoiceSpeedAndPitchSliders` | Adjusts speech speed (1.5x) and pitch (1.2x) sliders and verifies reactive UI labels. |
| 9 | `testWebcamActivationToggle` | Clicks "Use Real Webcam" to trigger camera mode and verifies toggle state changes to "Close Camera". |
| 10 | `testPhraseSubmission` | Verifies phrase submission via "Submit" button works cleanly and keeps page operational. |

---

## ⚙️ Configuration Parameters (`config.properties`)

Edit `src/test/resources/config.properties` to customize execution:

- `app.url`: Web app address (`http://localhost:3000` or `http://localhost:5173`).
- `browser`: Browser choice (`chrome` or `edge`).
- `headless`: Run in background without browser UI (`true` or `false`).
- `timeout.explicit`: Explicit wait timeout in seconds (default `15`).
- `user.email`: Default demo email (`Sachingupta@gmail.com`).
- `user.password`: Default demo password (`123456789`).
