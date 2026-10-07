package com.terraformtitans.authrouting;

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.terraformtitans.support.UiTestBase;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Authentication gate check for the app entry page. */
class AuthenticationRoutingTests extends UiTestBase {
  /** Steps: open a fresh app without a token; verify the login portal is displayed. */
  @Test @DisplayName("Unauthenticated user sees login")
  void visitorWithoutSessionSeesLogin() {
    assertTrue(visibleText("AUTHORIZE PATIENT"));
    assertTrue(visibleText("User Email Address"));
  }
}
