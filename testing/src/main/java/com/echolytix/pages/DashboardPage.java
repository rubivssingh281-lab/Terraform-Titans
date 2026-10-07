package com.echolytix.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class DashboardPage extends BasePage {

    // Unique Dashboard locators (only present when logged in)
    private final By dashboardSignCard = By.xpath("//button[.//span[contains(text(), 'Sign Gestures')]]");
    private final By signOutButton = By.xpath("//button[contains(., 'Sign Out')]");
    private final By patientHubBadge = By.xpath("//div[contains(text(), 'PATIENT HUB ACTIVATED')]");
    private final By navSignButton = By.xpath("//nav//button[contains(., 'Sign') and not(contains(., 'Sign Out'))]");

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
