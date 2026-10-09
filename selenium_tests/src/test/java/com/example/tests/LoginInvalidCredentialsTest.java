package com.example.tests;
import java.time.Duration;
import java.util.Map;
import org.junit.Assert;
import org.junit.Test;
import org.openqa.selenium.JavascriptExecutor;
public class LoginInvalidCredentialsTest extends BaseTest {

    }

    private Map<String, Object> executeFetchScript(String script) {
        return (Map<String, Object>) ((JavascriptExecutor) driver).executeAsyncScript(script);
    }

    @Test
    public void testLoginInvalidCredentialsReturnsError() {
        String script = 
            "const done = arguments[arguments.length - 1];" +
            "fetch('/api/auth/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email: 'wrong@test.com', password: 'wrongpassword'}) })" +
            "  .then(res => done({status: res.status}))" +
            "  .catch(err => done({status: 500}));";
            
        Map<String, Object> result = executeFetchScript(script);
        long status = ((Number) result.get("status")).longValue();
        Assert.assertTrue("Status should be client error", status == 401 || status == 404);
    }
}
