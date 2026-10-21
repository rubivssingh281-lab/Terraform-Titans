package com.echolytix.pages;

import com.echolytix.config.LocatorReader;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class DashboardPage extends BasePage {

    // Unique Dashboard locators loaded dynamically from centralized locator.properties
    private final By dashboardSignCard = LocatorReader.getBy("dashboard.sign.card");
    private final By signOutButton = LocatorReader.getBy("dashboard.signout.button");
    private final By patientHubBadge = LocatorReader.getBy("dashboard.patient.hub.badge");
    private final By navSignButton = LocatorReader.getBy("nav.sign.button");

    public DashboardPage(WebDriver driver) {
        super(driver);
    }

    public boolean isDashboardDisplayed() {
        return isDisplayed(signOutButton, 3) || isDisplayed(dashboardSignCard, 3) || isDisplayed(patientHubBadge, 3);
    }

    public HandSignGesturePage navigateToHandSignFromHeader() {
        waitForVisibility(signOutButton);
        jsClick(navSignButton);
        HandSignGesturePage page = new HandSignGesturePage(driver);
        page.waitForPageLoaded();
        return page;
    }

    public HandSignGesturePage navigateToHandSignFromCard() {
        waitForVisibility(dashboardSignCard);
        jsClick(dashboardSignCard);
        HandSignGesturePage page = new HandSignGesturePage(driver);
        page.waitForPageLoaded();
        return page;
    }

    public LoginPage logout() {
        if (isDisplayed(signOutButton, 3)) {
            jsClick(signOutButton);
        }
        return new LoginPage(driver);
    }
}
