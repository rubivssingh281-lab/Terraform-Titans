package com.echolytix.tests;

import com.echolytix.config.LocatorReader;
import org.openqa.selenium.By;
import org.testng.Assert;
import org.testng.annotations.Test;

public class LocatorReaderTest {

    @Test
    public void testAllCoreLocatorsLoadSuccessfully() {
        // Test Authentication Locators
        Assert.assertNotNull(LocatorReader.getBy("login.email.input"));
        Assert.assertNotNull(LocatorReader.getBy("login.password.input"));
        Assert.assertNotNull(LocatorReader.getBy("login.authorize.button"));
        Assert.assertNotNull(LocatorReader.getBy("login.autofill.button"));
        Assert.assertNotNull(LocatorReader.getBy("login.dashboard.signout"));
        Assert.assertNotNull(LocatorReader.getBy("login.dashboard.signcard"));

        // Test Registration Locators
        Assert.assertNotNull(LocatorReader.getBy("register.link"));
        Assert.assertNotNull(LocatorReader.getBy("register.submit.button"));

        // Test Dashboard Locators
        Assert.assertNotNull(LocatorReader.getBy("dashboard.sign.card"));
        Assert.assertNotNull(LocatorReader.getBy("dashboard.signout.button"));
        Assert.assertNotNull(LocatorReader.getBy("dashboard.patient.hub.badge"));

        // Test Hand Sign Gesture Locators
        Assert.assertNotNull(LocatorReader.getBy("handsign.translation.heading"));
        Assert.assertNotNull(LocatorReader.getBy("handsign.current.gesture.value"));
        Assert.assertNotNull(LocatorReader.getBy("handsign.constructed.phrase.container"));
        Assert.assertNotNull(LocatorReader.getBy("handsign.webcam.toggle.button"));

        // Test Dynamic Parameterized Locators
        By gestureBtn = LocatorReader.getBy("handsign.cheat.sheet.gesture.button", "HELLO", "HELLO");
        Assert.assertNotNull(gestureBtn);
        Assert.assertTrue(gestureBtn.toString().contains("HELLO"));

        By fingerSignal = LocatorReader.getBy("handsign.live.finger.signal", "THUMB");
        Assert.assertNotNull(fingerSignal);
        Assert.assertTrue(fingerSignal.toString().contains("THUMB"));
    }
}
