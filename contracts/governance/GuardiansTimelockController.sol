// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title GuardiansTimelockController
 * @author Ricoz
 * @notice Standard OZ TimelockController for the Guardians DAO. Holds admin roles on
 *         protocol contracts post-Phase-3 transfer. Min delay = 48h (per docs/12).
 *
 * Wiring at deploy:
 *   - proposers   = []           (granted to Governor right after Governor deploys)
 *   - executors   = [address(0)] (open execution: anyone can execute a queued op)
 *   - admin       = deployer     (temporary; renounced after Governor wiring is done)
 */
contract GuardiansTimelockController is TimelockController {
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(minDelay, proposers, executors, admin) {}
}
