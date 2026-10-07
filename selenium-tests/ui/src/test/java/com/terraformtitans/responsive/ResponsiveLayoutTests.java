package com.terraformtitans.responsive;

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.terraformtitans.support.UiTestBase;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.openqa.selenium.Dimension;
import org.openqa.selenium.JavascriptExecutor;

/** Desktop-to-phone viewport layout check. */
class ResponsiveLayoutTests extends UiTestBase {
  /** Steps: open the app on desktop, resize to phone width, and check there is no horizontal overflow. */
  @Test @DisplayName("No horizontal scroll on resize")
  void phoneWidthHasNoHorizontalOverflow() {
    signInWithDemoAccount();
    driver.manage().window().setSize(new Dimension(390, 844));
    long viewport = ((Number) ((JavascriptExecutor) driver).executeScript("return window.innerWidth")).longValue();
    long document = ((Number) ((JavascriptExecutor) driver).executeScript(
        "return document.documentElement.scrollWidth")).longValue();
    assertTrue(document <= viewport, "Content width " + document + " exceeds viewport " + viewport);
  }
}
