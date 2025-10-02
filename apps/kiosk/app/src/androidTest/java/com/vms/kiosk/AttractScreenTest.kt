package com.vms.kiosk

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.vms.kiosk.ui.screens.AttractScreen
import com.vms.kiosk.ui.theme.VMSKioskTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AttractScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun attractScreen_displaysWelcomeMessage() {
        composeTestRule.setContent {
            VMSKioskTheme {
                AttractScreen(
                    onStartCheckIn = {},
                    onStartCheckOut = {}
                )
            }
        }

        composeTestRule
            .onNodeWithText("Welcome to Our Office")
            .assertIsDisplayed()
    }

    @Test
    fun attractScreen_displaysCheckInButton() {
        composeTestRule.setContent {
            VMSKioskTheme {
                AttractScreen(
                    onStartCheckIn = {},
                    onStartCheckOut = {}
                )
            }
        }

        composeTestRule
            .onNodeWithText("Check In")
            .assertIsDisplayed()
            .assertHasClickAction()
    }

    @Test
    fun attractScreen_displaysCheckOutButton() {
        composeTestRule.setContent {
            VMSKioskTheme {
                AttractScreen(
                    onStartCheckIn = {},
                    onStartCheckOut = {}
                )
            }
        }

        composeTestRule
            .onNodeWithText("Check Out")
            .assertIsDisplayed()
            .assertHasClickAction()
    }

    @Test
    fun attractScreen_checkInButtonTriggersCallback() {
        var checkInClicked = false

        composeTestRule.setContent {
            VMSKioskTheme {
                AttractScreen(
                    onStartCheckIn = { checkInClicked = true },
                    onStartCheckOut = {}
                )
            }
        }

        composeTestRule
            .onNodeWithText("Check In")
            .performClick()

        assert(checkInClicked)
    }

    @Test
    fun attractScreen_checkOutButtonTriggersCallback() {
        var checkOutClicked = false

        composeTestRule.setContent {
            VMSKioskTheme {
                AttractScreen(
                    onStartCheckIn = {},
                    onStartCheckOut = { checkOutClicked = true }
                )
            }
        }

        composeTestRule
            .onNodeWithText("Check Out")
            .performClick()

        assert(checkOutClicked)
    }

    @Test
    fun attractScreen_displaysOnlineStatus() {
        composeTestRule.setContent {
            VMSKioskTheme {
                AttractScreen(
                    onStartCheckIn = {},
                    onStartCheckOut = {}
                )
            }
        }

        composeTestRule
            .onNodeWithText("ONLINE")
            .assertIsDisplayed()
    }

    @Test
    fun attractScreen_displaysTouchToStartIndicator() {
        composeTestRule.setContent {
            VMSKioskTheme {
                AttractScreen(
                    onStartCheckIn = {},
                    onStartCheckOut = {}
                )
            }
        }

        composeTestRule
            .onNodeWithText("Touch to start")
            .assertIsDisplayed()
    }
}