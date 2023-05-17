/**
 * @title Voting Dapp
 * @author github.com/devival
 */

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// Import statements
// Uncomment this line to use console.log
import "hardhat/console.sol";

// Interfaces
// Libraries

// Contracts
contract VotingDapp {
    // State variables
    uint256 public nextElectionId;

    // candidate can be registerred to multiple elections
    mapping(uint256 => mapping(address => bool)) public candidateStatus; // electionID > candidate > regStatus
    mapping(uint256 => mapping(address => bool)) public voter; // electionID > voter > if voted
    mapping(uint256 => mapping(address => uint256)) public candidateVotes; // electionID > candidate > votes

    mapping(uint256 => address) public electionInitiator;
    mapping(uint256 => uint256) public registrationPeriod;
    mapping(uint256 => uint256) public votingPeriod;
    mapping(uint256 => uint256) public electionEndTime;
    // Events
    event ElectionStart(
        uint256 nextElectionId,
        address initiator,
        uint256 registrationPeriod,
        uint256 votingPeriod,
        uint256 endingTime
    );
    event CadidateRegistered(uint256 electionId, address candidate);
    event Voted(address voter, uint256 electionId, address candidate);

    // Errors
    // Modifiers
    ///////////////
    // Functions //
    ///////////////
    constructor() {}

    // "start an election" function (anyone) @params: reg period, voting period, ending time
    function electionStart(
        uint256 registrationPeriod_,
        uint256 votingPeriod_,
        uint256 endingTime_
    ) public returns (uint256) {
        require(
            registrationPeriod_ > 20 && votingPeriod_ > 20,
            "Registration and Voting periods have to be greater than 20 seconds"
        );
        require(
            (registrationPeriod_ + votingPeriod_) < endingTime_,
            "Please follow the time conditions: (Registration period + Voting Period) < Ending Time"
        );

        // election starts right away, all period are stored in seconds
        nextElectionId++;
        registrationPeriod[nextElectionId] = block.timestamp + registrationPeriod_; // current + reg time
        votingPeriod[nextElectionId] = (block.timestamp + registrationPeriod_) + votingPeriod_; // current + reg time + voting time
        electionEndTime[nextElectionId] = block.timestamp + endingTime_; // current + end time
        electionInitiator[nextElectionId] = address(msg.sender);

        // notify the election start
        emit ElectionStart(
            nextElectionId,
            address(msg.sender),
            block.timestamp + registrationPeriod_,
            (block.timestamp + registrationPeriod_) + votingPeriod_,
            block.timestamp + endingTime_
        );
        return nextElectionId;
    }

    // "cadidate registration" function
    // @audit if initiator creates another election, previous candidates already have earlier votes
    function candidateReg(uint256 electionId_) public {
        address candidate_ = address(msg.sender);
        // @audit-ok require registration period to be open
        require(
            registrationPeriod[electionId_] > block.timestamp,
            "No registration period open for the given initiator"
        );
        // check if candidate not registerred already
        require(!candidateStatus[electionId_][candidate_], "Already registered");

        candidateStatus[electionId_][candidate_] = true;

        emit CadidateRegistered(electionId_, candidate_);
    }

    // "vote" function (anyone, once, during the voting period)
    function vote(uint256 electionId_, address candidate_) public {
        // @audit-ok check if the election is on voting period
        // reg 0-21, voting 21-42, end 45
        require(
            registrationPeriod[electionId_] < block.timestamp && // check if reg is closed
                votingPeriod[electionId_] > block.timestamp, // checl if voting is open
            "Voting period is not open"
        );
        // check if the candidate is registered
        require(candidateStatus[electionId_][candidate_], "Candidate is not registered");
        // check if voted already
        require(!voter[electionId_][address(msg.sender)], "Already voted");

        // vote
        candidateVotes[electionId_][candidate_]++;
        voter[electionId_][address(msg.sender)] = true;

        emit Voted(address(msg.sender), electionId_, candidate_);
    }

    // public view functions
    function getElectionStatus(uint256 electionId_) public view returns (bool) {
        return (electionEndTime[electionId_] > block.timestamp);
    }

    function getRegistrationEndTime(uint256 electionId_) public view returns (uint256) {
        return (registrationPeriod[electionId_]);
    }

    function getVotingEndTime(uint256 electionId_) public view returns (uint256) {
        return (votingPeriod[electionId_]);
    }

    function getElectionEndTime(uint256 electionId_) public view returns (uint256) {
        return (electionEndTime[electionId_]);
    }

    function getElectionInitiator(uint256 electionId_) public view returns (address) {
        return (electionInitiator[electionId_]);
    }

    function getCandidateVotes(uint256 electionId_, address candidate_) public view returns (uint256) {
        return candidateVotes[electionId_][candidate_];
    }
}
