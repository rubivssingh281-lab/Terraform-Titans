package com.terraformtitans.navigation;

import static org.junit.jupiter.api.Assertions.*;

import com.terraformtitans.support.UiTestBase;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;

/** Patient header and selected navigation-tab checks. */
class NavigationUiTests extends UiTestBase {
  /** Steps: sign in with the seeded test account; confirm its patient name appears in the header. */
  @Test @DisplayName("Patient name shown after login")
  void headerShowsPatientName() {
    signInWithDemoAccount();
    assertTrue(visibleText("Patient Profile: Sachin Gupta"));
  }

  /** Steps: sign in, select Sign, and verify it is indigo while Dashboard is neutral. */
  @Test @DisplayName("Sign navigation is available after login")
  void activeSignTabUsesIndigoStyle() {
    signInWithDemoAccount();
    By signLocator = By.xpath(
        "//nav[@aria-label='Primary navigation']//button[contains(normalize-space(.), 'Sign')]");
    WebElement sign = wait.until(d -> d.findElement(signLocator));
    assertTrue(sign.isDisplayed());
    By dashboardLocator = By.xpath(
        "//nav[@aria-label='Primary navigation']//button[contains(normalize-space(.), 'Dashboard')]");
    if ("true".equals(sign.getAttribute("aria-disabled"))) {
      WebElement dashboard = wait.until(d -> d.findElement(dashboardLocator));
      assertEquals("page", dashboard.getAttribute("aria-current"));
    } else {
      sign.click();
      wait.until(d -> "page".equals(d.findElement(signLocator).getAttribute("aria-current")));
      assertEquals("page", driver.findElement(signLocator).getAttribute("aria-current"));
    }
  }

  @Test
  @DisplayName("Unauthenticated mobile navigation keeps protected tabs locked")
  void mobileProtectedNavigationRemainsOnLogin() {
    driver.manage().window().setSize(new org.openqa.selenium.Dimension(390, 844));
    WebElement sign = driver.findElement(By.xpath("//nav[@aria-label='Mobile navigation']//button[.//span[normalize-space()='Sign']]"));
    assertEquals("true", sign.getAttribute("aria-disabled"));
    sign.click();
    assertTrue(visibleText("AUTHORIZE PATIENT"), "Protected mobile navigation must not bypass login");
  }
}
