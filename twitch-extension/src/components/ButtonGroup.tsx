import styled from "styled-components";

export default styled.div`
  margin-bottom: 0.5rem;
  width: 100%;

  & > button {
    width: 50%;
    border-radius: 0;

    &:first-child {
      border-top-left-radius: 0.25rem;
      border-bottom-left-radius: 0.25rem;
    }

    &:last-child {
      border-top-right-radius: 0.25rem;
      border-bottom-right-radius: 0.25rem;
    }

    &:not(:last-child) {
      border-right-width: 0px; /* Prevent double borders */
    }
  }

  /* Clear floats (clearfix hack) */
  &:after {
    content: "";
    clear: both;
    display: table;
  }
`;
