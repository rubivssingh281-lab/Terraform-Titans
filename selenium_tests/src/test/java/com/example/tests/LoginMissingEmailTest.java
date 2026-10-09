package com.example.tests;
import java.time.Duration;
import java.util.Map;
import org.junit.Assert;
import org.junit.Test;
import org.openqa.selenium.JavascriptExecutor;
public class LoginMissingEmailTest extends BaseTest {

    }

    private Map<String, Object> executeFetchScript(String script) {
        return (Map<String, Object>) ((JavascriptExecutor) driver).executeAsyncScript(script);
    }

    @Test
    public void testLoginMissingEmailReturnsBadRequest() {
        String script = 
            "const done = arguments[arguments.length - 1];" +
            "fetch('/api/auth/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({password: 'password123'}) })" +
            "  .then(res => done({status: res.status}))" +
            "  .catch(err => done({status: 500}));";
            
        Map<String, Object> result = executeFetchScript(script);
        long status = ((Number) result.get("status")).longValue();
        Assert.assertEquals(400, status);
    }
}
