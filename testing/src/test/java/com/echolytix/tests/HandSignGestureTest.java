package com.echolytix.tests;

import com.echolytix.base.BaseTest;
import com.echolytix.pages.DashboardPage;
import com.echolytix.pages.HandSignGesturePage;
import com.echolytix.pages.LoginPage;
import org.testng.Assert;
import org.testng.annotations.Test;

public class HandSignGestureTest extends BaseTest {

    @Test(description = "Verify successful navigation to Hand Sign Gesture page from Dashboard")
    public void testNavigateToHandSignFeature() {
        LoginPage loginPage = new LoginPage(driver);
        DashboardPage dashboardPage = new DashboardPage(driver);

        loginPage.waitForAppReady();

        if (!dashboardPage.isDashboardDisplayed()) {
            dashboardPage = loginPage.loginUsingDemoCredentials();
        }

        Assert.assertTrue(dashboardPage.isDashboardDisplayed(), "Dashboard should be displayed after authorization");

        HandSignGesturePage handSignPage = dashboardPage.navigateToHandSignFromHeader();
        Assert.assertTrue(handSignPage.isPageLoaded(), "Hand Sign Gesture page should be loaded");
    }

    @Test(description = "Verify all UI elements and initial states on the Hand Sign Gesture screen")
    public void testHandSignPageElementsPresent() {
        HandSignGesturePage handSignPage = loginAndNavigateToHandSign();

        Assert.assertTrue(handSignPage.isPageLoaded(), "Translation and Cheat Sheet sections must be visible");

        // Verify metrics HUD
        Assert.assertNotNull(handSignPage.getConfidenceScore(), "Confidence indicator should be present");
        Assert.assertNotNull(handSignPage.getFpsScore(), "FPS indicator should be present");

        // Verify Live Finger signals
        String[] fingers = {"Thumb", "Index", "Middle", "Ring", "Pinky"};
        for (String finger : fingers) {
            Assert.assertTrue(handSignPage.isFingerSignalDisplayed(finger), "Finger signal indicator missing for: " + finger);
        }

        // Verify current gesture element is present
        String currentGesture = handSignPage.getCurrentGesture();
        Assert.assertNotNull(currentGesture, "Current gesture indicator should be present");
    }

    @Test(description = "Verify selecting a gesture from the cheat sheet updates Current Gesture, Confidence and Phrase")
    public void testSingleGestureSelectionUpdatesState() {
        HandSignGesturePage handSignPage = loginAndNavigateToHandSign();
        handSignPage.clickClearAll();

        // Click HELLO gesture
        handSignPage.selectGesture("HELLO");

        // Assert Current Gesture
        String currentGesture = handSignPage.getCurrentGesture();
        Assert.assertEquals(currentGesture, "HELLO", "Current gesture should update to 'HELLO'");

        // Assert Confidence
        String confidence = handSignPage.getConfidenceScore();
        Assert.assertTrue(confidence.contains("98.5%"), "Confidence score should be 98.5% upon simulated gesture selection");

        // Assert Constructed Phrase
        String phrase = handSignPage.getConstructedPhrase();
        Assert.assertTrue(phrase.contains("HELLO"), "Constructed phrase should contain 'HELLO'");
    }

    @Test(description = "Verify multiple gestures are concatenated into a complete sentence")
    public void testMultiGesturePhraseConstruction() {
        HandSignGesturePage handSignPage = loginAndNavigateToHandSign();
        handSignPage.clickClearAll();

        // Select three gestures sequentially
        handSignPage.selectGesture("HELLO");
        handSignPage.selectGesture("HELP");
        handSignPage.selectGesture("NEED WATER");

        String phrase = handSignPage.getConstructedPhrase();
        Assert.assertTrue(phrase.contains("HELLO HELP NEED WATER"), 
                "Phrases should be appended sequentially with whitespace separation. Actual: " + phrase);
    }

    @Test(description = "Verify 'Delete Word' removes the last appended gesture")
    public void testDeleteWordFunctionality() {
        HandSignGesturePage handSignPage = loginAndNavigateToHandSign();
        handSignPage.clickClearAll();

        // Append two gestures
        handSignPage.selectGesture("HELLO");
        handSignPage.selectGesture("HELP");

        String phraseBefore = handSignPage.getConstructedPhrase();
        Assert.assertTrue(phraseBefore.contains("HELLO HELP"), "Constructed phrase before delete should contain 'HELLO HELP'");

        // Click Delete Word
        Assert.assertTrue(handSignPage.isDeleteWordEnabled(), "Delete Word button should be enabled when phrase exists");
        handSignPage.clickDeleteWord();

        String phraseAfter = handSignPage.getConstructedPhrase();
        Assert.assertTrue(phraseAfter.contains("HELLO"), "Last word 'HELP' should be removed, leaving 'HELLO'");
        Assert.assertFalse(phraseAfter.contains("HELP"), "Phrase should not contain 'HELP' after deletion");
    }

    @Test(description = "Verify 'Clear All' completely resets constructed phrase")
    public void testClearAllPhraseAndState() {
        HandSignGesturePage handSignPage = loginAndNavigateToHandSign();

        handSignPage.selectGesture("THANK YOU");
        handSignPage.selectGesture("PLEASE");

        Assert.assertTrue(handSignPage.getConstructedPhrase().contains("THANK YOU"), "Phrase should contain added gesture");

        // Click Clear All
        handSignPage.clickClearAll();

        String clearedPhrase = handSignPage.getConstructedPhrase();
        Assert.assertTrue(clearedPhrase.contains("Perform gesture...") || clearedPhrase.isBlank(), 
                "Phrase container should show placeholder text or empty after clear. Actual: " + clearedPhrase);
    }

    @Test(description = "Verify toggling the Skeleton Overlay checkbox")
    public void testSkeletonOverlayToggle() {
        HandSignGesturePage handSignPage = loginAndNavigateToHandSign();

        // Initial check
        boolean initialCheck = handSignPage.isSkeletonOverlayChecked();

        // Toggle state
        handSignPage.toggleSkeletonOverlay();
        Assert.assertEquals(handSignPage.isSkeletonOverlayChecked(), !initialCheck, "Checkbox state should be inverted after click");

        // Toggle back
        handSignPage.toggleSkeletonOverlay();
        Assert.assertEquals(handSignPage.isSkeletonOverlayChecked(), initialCheck, "Checkbox state should revert to original");
    }

    @Test(description = "Verify voice speed rate and pitch sliders update UI values")
    public void testVoiceSpeedAndPitchSliders() {
        HandSignGesturePage handSignPage = loginAndNavigateToHandSign();

        // Adjust Speed Rate slider
        handSignPage.setSpeedRate(1.5);
        String speedDisplay = handSignPage.getSpeedRateDisplay();
        Assert.assertEquals(speedDisplay, "1.5x", "Speed rate label should reflect updated slider value");

        // Adjust Pitch slider
        handSignPage.setPitch(1.2);
        String pitchDisplay = handSignPage.getPitchDisplay();
        Assert.assertEquals(pitchDisplay, "1.2x", "Pitch label should reflect updated slider value");
    }

    @Test(description = "Verify toggling the webcam hardware feed")
    public void testWebcamActivationToggle() {
        HandSignGesturePage handSignPage = loginAndNavigateToHandSign();

        String initialText = handSignPage.getWebcamButtonText();
        Assert.assertTrue(initialText.contains("Use Real Webcam") || initialText.contains("Close Camera"), 
                "Initial button text should indicate camera toggle state");

        // Click to toggle camera
        handSignPage.toggleWebcam();
        String toggledText = handSignPage.getWebcamButtonText();
        Assert.assertNotEquals(toggledText, initialText, "Button text should change when camera toggle is clicked");

        // Click to revert
        handSignPage.toggleWebcam();
        String revertedText = handSignPage.getWebcamButtonText();
        Assert.assertEquals(revertedText, initialText, "Button text should revert to original state");
    }

    @Test(description = "Verify phrase submission triggers and retains state cleanly")
    public void testPhraseSubmission() {
        HandSignGesturePage handSignPage = loginAndNavigateToHandSign();
        handSignPage.clickClearAll();

        handSignPage.selectGesture("HELLO");
        handSignPage.selectGesture("HOW ARE YOU");

        Assert.assertTrue(handSignPage.isSubmitEnabled(), "Submit button should be active when phrase is constructed");
        handSignPage.clickSubmit();

        // Verify page remains responsive and operational
        Assert.assertTrue(handSignPage.isPageLoaded(), "Page should remain loaded and healthy after submission");
    }
}
