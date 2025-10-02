package com.vms.kiosk.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vms.kiosk.data.repository.KioskRepository
import com.vms.kiosk.data.repository.TelemetryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class MainUiState(
    val isOnboarded: Boolean = false,
    val isOnline: Boolean = true,
    val lastHeartbeat: Long = 0L
)

@HiltViewModel
class MainViewModel @Inject constructor(
    private val kioskRepository: KioskRepository,
    private val telemetryRepository: TelemetryRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(MainUiState())
    val uiState: StateFlow<MainUiState> = _uiState.asStateFlow()

    init {
        checkOnboardingStatus()
        startHeartbeat()
    }

    private fun checkOnboardingStatus() {
        viewModelScope.launch {
            kioskRepository.getKioskConfig().collect { config ->
                _uiState.value = _uiState.value.copy(
                    isOnboarded = config != null
                )
            }
        }
    }

    private fun startHeartbeat() {
        viewModelScope.launch {
            telemetryRepository.startHeartbeat()
        }
    }

    fun onAppResumed() {
        viewModelScope.launch {
            telemetryRepository.recordAppEvent("app_resumed")
        }
    }

    fun onAppPaused() {
        viewModelScope.launch {
            telemetryRepository.recordAppEvent("app_paused")
        }
    }
}