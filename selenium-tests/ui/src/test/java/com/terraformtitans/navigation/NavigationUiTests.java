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
  @Test @DisplayName("Current Sign tab is highlighted")
  void activeSignTabUsesIndigoStyle() {
    signInWithDemoAccount();
    WebElement sign = driver.findElement(By.xpath("//header//button[normalize-space()='Sign']"));
    sign.click();
    assertTrue(sign.getAttribute("class").contains("indigo-500/15"), "Sign tab should have indigo active styling");
    WebElement dashboard = driver.findElement(By.xpath("//header//button[normalize-space()='Dashboard']"));
    assertFalse(dashboard.getAttribute("class").contains("indigo-500/15"), "Other tabs should be neutral");
  }
}
