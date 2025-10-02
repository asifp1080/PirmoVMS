package com.vms.kiosk.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vms.kiosk.data.repository.KioskRepository
import com.vms.kiosk.data.repository.NetworkRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AttractUiState(
    val welcomeMessage: String = "Welcome to Our Office",
    val logoUrl: String? = null,
    val backgroundImageUrl: String? = null,
    val isOnline: Boolean = true,
    val currentTime: String = "",
    val currentDate: String = ""
)

@HiltViewModel
class AttractViewModel @Inject constructor(
    private val kioskRepository: KioskRepository,
    private val networkRepository: NetworkRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AttractUiState())
    val uiState: StateFlow<AttractUiState> = _uiState.asStateFlow()

    init {
        loadKioskConfig()
        observeNetworkStatus()
    }

    private fun loadKioskConfig() {
        viewModelScope.launch {
            kioskRepository.getKioskConfig().collect { config ->
                config?.let {
                    _uiState.value = _uiState.value.copy(
                        welcomeMessage = it.ui.welcomeMessage ?: "Welcome to Our Office",
                        logoUrl = it.ui.logoUrl,
                        backgroundImageUrl = it.ui.backgroundImageUrl
                    )
                }
            }
        }
    }

    private fun observeNetworkStatus() {
        viewModelScope.launch {
            networkRepository.isOnline.collect { isOnline ->
                _uiState.value = _uiState.value.copy(isOnline = isOnline)
            }
        }
    }
}