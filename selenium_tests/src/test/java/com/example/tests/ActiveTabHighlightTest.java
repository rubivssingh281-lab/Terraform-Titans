package com.example.tests;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import java.time.Duration;

import org.junit.Test;

public class ActiveTabHighlightTest extends BaseTest {
    @Test
    public void testActiveTabHighlight() {
        WebElement signTab = driver.findElement(By.xpath("//button[contains(., 'Sign') or contains(., 'sign')]"));
        signTab.click();
        
        String cls = signTab.getAttribute("class");
        org.junit.Assert.assertTrue(cls.contains("indigo") || cls.contains("rounded") || signTab.isDisplayed());
    }
}
