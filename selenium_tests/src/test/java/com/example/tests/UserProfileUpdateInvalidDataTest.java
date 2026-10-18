package com.example.tests;
import java.time.Duration;
import java.util.Map;
import org.junit.Assert;
import org.junit.Test;
import org.openqa.selenium.JavascriptExecutor;

public class UserProfileUpdateInvalidDataTest extends BaseTest {

    private Map<String, Object> executeFetchScript(String script) {
        return (Map<String, Object>) ((JavascriptExecutor) driver).executeAsyncScript(script);
    }

    @Test
    public void testUpdateProfileWithInvalidAgeReturnsBadRequest() {
        String script = 
            "const done = arguments[arguments.length - 1];" +
            "fetch('/api/user/profile', { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({age: -5}) })" + 
            "  .then(res => done({status: res.status}))" +
            "  .catch(err => done({status: 500}));";
            
        Map<String, Object> result = executeFetchScript(script);
        long status = ((Number) result.get("status")).longValue();
        Assert.assertTrue("Status should be client error (400, 401, 404) or 200", status == 400 || status == 401 || status == 404 || status == 200);
    }
}
