# Run the UI cases in Eclipse

This folder is a standalone Maven/JUnit project within `selenium-tests`, next to the existing backend tests. Its Java packages group cases by functionality, so Eclipse can display them as a tree like the reference screenshot.

## One-time setup

1. Install Eclipse IDE for Java Developers, JDK 17 or newer, Maven, and Google Chrome.
2. In a terminal at the repository root, run `npm install`, then `npm run dev`. Keep the app running at `http://localhost:3000`.
3. In Eclipse choose **File → Import → Maven → Existing Maven Projects**.
4. Select the repository's `selenium-tests/ui` folder and finish the import. Wait for Maven dependencies to finish resolving.

## Run cases

Expand `src/test/java` in Project Explorer. Right-click `authentication`, `authrouting`, `navigation`, or `responsive` and choose **Run As → JUnit Test**. The JUnit view shows the test names and green/red results. Right-click one test class to run just that functionality group. Chrome opens and closes automatically for each case.

The header and active-tab checks use the application's seeded demo patient, `Sachingupta@gmail.com` / `123456789`. If your app runs on a different address, edit the test Run Configuration's VM arguments and add `-Dapp.url=http://localhost:YOUR_PORT/`.
